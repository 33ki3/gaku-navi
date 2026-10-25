"""TypeScriptから受け取った編成条件を整数モデルにして、CP-SATで最適性を検証する"""

import os
from dataclasses import dataclass
from fractions import Fraction
from math import floor, lcm
from time import perf_counter
from typing import Any, Literal, NotRequired, TypedDict, cast

from ortools.sat.python import cp_model

PARAMETER_TYPES = ("vocal", "dance", "visual")
INT64_LIMIT = (1 << 62) - 1
PAYLOAD_VERSION = 1


class RawSynergyAbility(TypedDict):
    """JSON上のシナジー条件"""

    actionId: str
    parsedValue: int | float
    usedCount: int
    maxCount: NotRequired[int | None]


class RawCard(TypedDict):
    """JSON上のカード条件"""

    id: str
    name: str
    type: str
    parameterType: str
    spCategory: str
    baseScoreWithoutParamBonus: int
    paramBonusPercent: dict[str, int | float]
    providedActions: NotRequired[dict[str, int]]
    synergyAbilities: NotRequired[list[RawSynergyAbility]]
    isRental: NotRequired[bool]
    normalAllowed: NotRequired[bool]
    rentalAllowed: NotRequired[bool]


class RawProblem(TypedDict):
    """JSON上の編成制約とスコア条件"""

    unitSize: int
    typeCountMin: dict[str, int]
    typeCountMax: dict[str, int]
    spConstraint: dict[str, int]
    outsideParamBonusPercent: dict[str, int | float]
    parameterBonusRows: list[dict[str, int]]
    nonSupportParams: dict[str, int]
    paramCap: NotRequired[int | None]
    fixedCardIds: NotRequired[list[str]]
    fixedRentalCardIds: NotRequired[list[str]]


class RawCandidate(TypedDict):
    """JSON上の比較対象編成"""

    cardIds: list[str]
    rentalCardId: str | None
    score: int


class RawPayload(TypedDict):
    """TypeScriptから受け取るJSON全体"""

    payloadVersion: int
    problem: RawProblem
    cards: list[RawCard]
    candidate: RawCandidate
    timeoutMs: NotRequired[int]


@dataclass(frozen=True)
class SynergyAbility:
    """編成時に他カードのアクション数で増減する点数条件"""

    action_id: str
    parsed_value: Fraction
    max_count: int | None
    used_count: int


@dataclass(frozen=True)
class Card:
    """CP-SATへ渡す1枚分のスコア・編成条件"""

    id: str
    name: str
    type: str
    parameter_type: str
    sp_category: str
    normal_allowed: bool
    rental_allowed: bool
    base_score_without_param_bonus: int
    param_bonus_percent: dict[str, Fraction]
    provided_actions: dict[str, int]
    synergy_abilities: tuple[SynergyAbility, ...]


@dataclass(frozen=True)
class Problem:
    """全体の編成制約と、パラメータ計算の前提値"""

    unit_size: int
    type_count_min: dict[str, int]
    type_count_max: dict[str, int]
    sp_constraint: dict[str, int]
    outside_param_bonus_percent: dict[str, Fraction]
    parameter_bonus_rows: tuple[dict[str, int], ...]
    non_support_params: dict[str, int]
    param_cap: int | None
    fixed_card_ids: tuple[str, ...]
    fixed_rental_card_ids: tuple[str, ...]


@dataclass(frozen=True)
class Candidate:
    """最適性を確認する基準編成"""

    card_ids: tuple[str, ...]
    rental_card_id: str | None
    score: int
    timeout_ms: int


def _integer(value: Any, name: str) -> int:
    """JSON数値をCP-SATで扱える整数として検証する

    Args:
        value: JSONから読み取った数値
        name: エラー表示に使う項目名

    Returns:
        範囲内の整数値

    Raises:
        ValueError: 整数でない値、真偽値、または整数範囲外の場合
    """
    if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value:
        raise ValueError(f"{name} must be an integer")
    result = int(value)
    if abs(result) > INT64_LIMIT:
        raise ValueError(f"{name} exceeds the CP-SAT integer range")
    return result


def _fraction(value: Any, name: str) -> Fraction:
    """JSON数値を浮動小数誤差のない分数へ変換する

    Args:
        value: JSONから読み取った数値
        name: エラー表示に使う項目名

    Returns:
        十進表記を保ったFraction値

    Raises:
        ValueError: 数値でない値、または真偽値の場合
    """
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number")
    return Fraction(str(value))


def _integer_parameter_values(value: Any, name: str) -> dict[str, int]:
    """Vo・Da・Viの整数値がそろっていることを確認する

    Args:
        value: JSONから読み取った属性別の値
        name: エラー表示に使う項目名

    Returns:
        属性名をキー、検証済み整数を値とする辞書

    Raises:
        ValueError: 属性の欠落、形式違い、または整数でない値がある場合
    """
    if not isinstance(value, dict):
        raise ValueError(f"{name} must be an object")
    result: dict[str, int] = {}
    for parameter_type in PARAMETER_TYPES:
        if parameter_type not in value:
            raise ValueError(f"{name}.{parameter_type} is required")
        result[parameter_type] = _integer(value[parameter_type], f"{name}.{parameter_type}")
    return result


def _fraction_parameter_values(value: Any, name: str) -> dict[str, Fraction]:
    """Vo・Da・Viの割合を検証し、正確な分数へ変換する

    Args:
        value: JSONから読み取った属性別の割合
        name: エラー表示に使う項目名

    Returns:
        属性名をキー、Fraction値を値とする辞書

    Raises:
        ValueError: 属性の欠落、形式違い、または数値でない値がある場合
    """
    if not isinstance(value, dict):
        raise ValueError(f"{name} must be an object")
    result: dict[str, Fraction] = {}
    for parameter_type in PARAMETER_TYPES:
        if parameter_type not in value:
            raise ValueError(f"{name}.{parameter_type} is required")
        result[parameter_type] = _fraction(value[parameter_type], f"{name}.{parameter_type}")
    return result


def _load_problem(payload: Any) -> tuple[Problem, list[Card], Candidate]:
    """Verifier用JSONを検査し、CP-SATで使うdataclassへ変換する

    Args:
        payload: TypeScript側から受け取ったJSON値

    Returns:
        編成条件、カード一覧、比較対象の編成

    Raises:
        ValueError: JSONの形式、値、ID参照がVerifierの契約に合わない場合
    """
    # TypedDictでJSONキーを補完できるようにし、値はここで実行時検証してdataclassへ変換する
    if not isinstance(payload, dict):
        raise ValueError("payload must be an object")
    raw_payload = cast(RawPayload, payload)
    if raw_payload.get("payloadVersion") != PAYLOAD_VERSION:
        raise ValueError(f"payloadVersion must be {PAYLOAD_VERSION}")
    raw_problem_value = raw_payload.get("problem")
    raw_cards_value = raw_payload.get("cards")
    raw_candidate_value = raw_payload.get("candidate")
    if (
        not isinstance(raw_problem_value, dict)
        or not isinstance(raw_cards_value, list)
        or not isinstance(raw_candidate_value, dict)
    ):
        raise ValueError("problem, cards, and candidate are required")
    raw_problem = cast(RawProblem, raw_problem_value)
    raw_cards: list[Any] = raw_cards_value
    raw_candidate = cast(RawCandidate, raw_candidate_value)
    if not raw_cards:
        raise ValueError("cards must not be empty")

    unit_size = _integer(raw_problem.get("unitSize"), "problem.unitSize")
    if unit_size < 1:
        raise ValueError("problem.unitSize must be positive")
    raw_rows = raw_problem.get("parameterBonusRows")
    if not isinstance(raw_rows, list):
        raise ValueError("problem.parameterBonusRows must be an array")
    parameter_bonus_rows = tuple(
        _integer_parameter_values(row, f"problem.parameterBonusRows[{index}]") for index, row in enumerate(raw_rows)
    )
    raw_param_cap = raw_problem.get("paramCap")
    param_cap = None if raw_param_cap is None else _integer(raw_param_cap, "problem.paramCap")

    cards: list[Card] = []
    card_ids: set[str] = set()
    for index, raw_card_value in enumerate(raw_cards):
        if not isinstance(raw_card_value, dict):
            raise ValueError(f"cards[{index}] must be an object")
        raw_card = cast(RawCard, raw_card_value)
        card_id = raw_card.get("id")
        name = raw_card.get("name")
        card_type = raw_card.get("type")
        parameter_type = raw_card.get("parameterType")
        sp_category = raw_card.get("spCategory")
        if not isinstance(card_id, str) or not card_id:
            raise ValueError(f"cards[{index}].id must be a non-empty string")
        # IDはCP-SAT変数を引くキーなので、重複すると別カードの選択状態が混ざる
        if card_id in card_ids:
            raise ValueError(f"duplicate card id: {card_id}")
        card_ids.add(card_id)
        if not isinstance(name, str) or not name:
            raise ValueError(f"cards[{index}].name must be a non-empty string")
        if card_type not in (*PARAMETER_TYPES, "assist"):
            raise ValueError(f"cards[{index}].type is invalid")
        if parameter_type not in PARAMETER_TYPES:
            raise ValueError(f"cards[{index}].parameterType is invalid")
        if sp_category not in (*PARAMETER_TYPES, "all", "none"):
            raise ValueError(f"cards[{index}].spCategory is invalid")

        is_rental = raw_card.get("isRental", False)
        normal_allowed = raw_card.get("normalAllowed", not is_rental)
        rental_allowed = raw_card.get("rentalAllowed", is_rental)
        if not isinstance(normal_allowed, bool) or not isinstance(rental_allowed, bool):
            raise ValueError(f"cards[{index}] availability flags must be booleans")
        if not normal_allowed and not rental_allowed:
            raise ValueError(f"cards[{index}] must be available as normal or rental")

        raw_provided_actions = raw_card.get("providedActions", {})
        raw_abilities = raw_card.get("synergyAbilities", [])
        if not isinstance(raw_provided_actions, dict) or not isinstance(raw_abilities, list):
            raise ValueError(f"cards[{index}] action and synergy data are invalid")
        provided_actions: dict[str, int] = {}
        for action_id, count in raw_provided_actions.items():
            if not isinstance(action_id, str):
                raise ValueError(f"cards[{index}].providedActions keys must be strings")
            provided_actions[action_id] = _integer(count, f"cards[{index}].providedActions.{action_id}")

        abilities: list[SynergyAbility] = []
        for ability_index, raw_ability_value in enumerate(raw_abilities):
            if not isinstance(raw_ability_value, dict):
                raise ValueError(f"cards[{index}].synergyAbilities[{ability_index}] is invalid")
            raw_ability = cast(RawSynergyAbility, raw_ability_value)
            action_id = raw_ability.get("actionId")
            if not isinstance(action_id, str) or not action_id:
                raise ValueError(f"cards[{index}].synergyAbilities[{ability_index}].actionId is invalid")
            ability_name = f"cards[{index}].synergyAbilities[{ability_index}]"
            raw_max_count = raw_ability.get("maxCount")
            max_count = None if raw_max_count is None else _integer(raw_max_count, f"{ability_name}.maxCount")
            if max_count is not None:
                if max_count < 0:
                    raise ValueError(f"{ability_name}.maxCount must not be negative")
            used_count = _integer(raw_ability.get("usedCount"), f"{ability_name}.usedCount")
            if used_count < 0:
                raise ValueError(f"{ability_name}.usedCount must not be negative")
            abilities.append(
                SynergyAbility(
                    action_id=action_id,
                    parsed_value=_fraction(raw_ability.get("parsedValue"), f"{ability_name}.parsedValue"),
                    max_count=max_count,
                    used_count=used_count,
                )
            )

        cards.append(
            Card(
                id=card_id,
                name=name,
                type=card_type,
                parameter_type=parameter_type,
                sp_category=sp_category,
                normal_allowed=normal_allowed,
                rental_allowed=rental_allowed,
                base_score_without_param_bonus=_integer(
                    raw_card.get("baseScoreWithoutParamBonus"),
                    f"cards[{index}].baseScoreWithoutParamBonus",
                ),
                param_bonus_percent=_fraction_parameter_values(
                    raw_card.get("paramBonusPercent"), f"cards[{index}].paramBonusPercent"
                ),
                provided_actions=provided_actions,
                synergy_abilities=tuple(abilities),
            )
        )

    def validate_ids(field: Literal["fixedCardIds", "fixedRentalCardIds"]) -> tuple[str, ...]:
        """Problem内のカードID配列を検証し、重複のないタプルにする"""
        values = raw_problem.get(field, [])
        if not isinstance(values, list) or any(not isinstance(value, str) for value in values):
            raise ValueError(f"problem.{field} must be an array of card ids")
        if len(set(values)) != len(values) or not set(values).issubset(card_ids):
            raise ValueError(f"problem.{field} has duplicate or unknown ids")
        return tuple(values)

    fixed_card_ids = validate_ids("fixedCardIds")
    fixed_rental_card_ids = validate_ids("fixedRentalCardIds")
    card_by_id = {card.id: card for card in cards}
    if any(not card_by_id[card_id].rental_allowed for card_id in fixed_rental_card_ids):
        raise ValueError("problem.fixedRentalCardIds contains a card that cannot be rented")

    candidate_ids = raw_candidate.get("cardIds")
    rental_card_id = raw_candidate.get("rentalCardId")
    if not isinstance(candidate_ids, list) or any(not isinstance(card_id, str) for card_id in candidate_ids):
        raise ValueError("candidate.cardIds must be an array")
    if rental_card_id is not None and not isinstance(rental_card_id, str):
        raise ValueError("candidate.rentalCardId must be a card id")
    if any(card_id not in card_ids for card_id in candidate_ids):
        raise ValueError("candidate contains an unknown card id")
    timeout_ms = _integer(raw_payload.get("timeoutMs", 10_000), "timeoutMs")
    if timeout_ms < 1:
        raise ValueError("timeoutMs must be positive")

    normalized_problem = Problem(
        unit_size=unit_size,
        type_count_min=_integer_parameter_values(raw_problem.get("typeCountMin"), "problem.typeCountMin"),
        type_count_max=_integer_parameter_values(raw_problem.get("typeCountMax"), "problem.typeCountMax"),
        sp_constraint=_integer_parameter_values(raw_problem.get("spConstraint"), "problem.spConstraint"),
        outside_param_bonus_percent=_fraction_parameter_values(
            raw_problem.get("outsideParamBonusPercent"), "problem.outsideParamBonusPercent"
        ),
        parameter_bonus_rows=parameter_bonus_rows,
        non_support_params=_integer_parameter_values(raw_problem.get("nonSupportParams"), "problem.nonSupportParams"),
        param_cap=param_cap,
        fixed_card_ids=fixed_card_ids,
        fixed_rental_card_ids=fixed_rental_card_ids,
    )
    candidate = Candidate(
        card_ids=tuple(candidate_ids),
        rental_card_id=rental_card_id,
        score=_integer(raw_candidate.get("score"), "candidate.score"),
        timeout_ms=timeout_ms,
    )
    return normalized_problem, cards, candidate


def _candidate_is_legal(problem: Problem, cards: list[Card], candidate: Candidate) -> str | None:
    """比較対象が編成制約を満たすか確認する

    Args:
        problem: 編成全体に適用する制約
        cards: Verifierに渡された全候補カード
        candidate: 検証する基準編成

    Returns:
        不正理由、または制約を満たす場合はNone
    """
    candidate_ids = candidate.card_ids
    card_by_id = {card.id: card for card in cards}
    if len(candidate_ids) != problem.unit_size or len(set(candidate_ids)) != problem.unit_size:
        return "candidate must contain exactly unitSize unique cards"
    picked = [card_by_id[card_id] for card_id in candidate_ids]
    if len({card.name for card in picked}) != problem.unit_size:
        return "candidate contains the same card more than once"
    if not set(problem.fixed_card_ids).issubset(candidate_ids):
        return "candidate omits a fixed card"
    rental_card_id = candidate.rental_card_id
    if rental_card_id is None:
        rental_only = [card for card in picked if card.rental_allowed and not card.normal_allowed]
        if len(rental_only) != 1:
            return "candidate must contain exactly one rental card"
        rental_card_id = rental_only[0].id
    elif rental_card_id not in candidate_ids or not card_by_id[rental_card_id].rental_allowed:
        return "candidate.rentalCardId must identify a selected card that can be rented"
    if not set(problem.fixed_rental_card_ids).issubset({rental_card_id}):
        return "candidate omits the fixed rental card"
    if any(not card.normal_allowed and card.id != rental_card_id for card in picked):
        return "candidate selects a card that is available only as a rental"
    if not card_by_id[rental_card_id].rental_allowed:
        return "candidate rental card is not available for rental"

    for parameter_type in PARAMETER_TYPES:
        type_count = sum(card.type == parameter_type for card in picked)
        if type_count < problem.type_count_min[parameter_type]:
            return f"candidate has too few {parameter_type} cards"
        if type_count > problem.type_count_max[parameter_type]:
            return f"candidate has too many {parameter_type} cards"
        sp_count = sum(card.sp_category in (parameter_type, "all") for card in picked)
        if sp_count < problem.sp_constraint[parameter_type]:
            return f"candidate does not meet {parameter_type} SP constraint"
    return None


def _score_support_by_card(problem: Problem, cards: list[Card], selected_ids: set[str]) -> dict[str, int]:
    """カード本体点と編成内連携点を、連携を持つカードへ集計する

    Args:
        problem: 編成全体に適用するスコア条件
        cards: Verifierに渡された全候補カード
        selected_ids: 編成に含まれるカードID

    Returns:
        カードIDごとのカード点
    """
    selected_cards = [card for card in cards if card.id in selected_ids]
    support_by_card: dict[str, int] = {}
    for card in selected_cards:
        card_score = card.base_score_without_param_bonus
        for ability in card.synergy_abilities:
            provider_count = sum(
                other.provided_actions.get(ability.action_id, 0) for other in selected_cards if other.name != card.name
            )
            possible_count_by_name: dict[str, int] = {}
            for other in cards:
                if other.name == card.name:
                    continue
                possible_count_by_name[other.name] = max(
                    possible_count_by_name.get(other.name, 0),
                    other.provided_actions.get(ability.action_id, 0),
                )
            maximum_other_count = sum(
                sorted(possible_count_by_name.values(), reverse=True)[: max(0, problem.unit_size - 1)]
            )
            remaining_count = (
                maximum_other_count
                if ability.max_count is None
                else min(maximum_other_count, max(0, ability.max_count - ability.used_count))
            )
            extra_count = min(provider_count, remaining_count)
            # Math.floorと同じ下方向の切り捨てを使い、負の小数も0方向へ丸めない
            card_score += floor(ability.parsed_value * extra_count)
        support_by_card[card.id] = card_score

    return support_by_card


def _score_candidate(problem: Problem, cards: list[Card], candidate_ids: tuple[str, ...]) -> int:
    """基準編成の点数をアプリと同じ切り捨て順で再計算する

    Args:
        problem: 編成全体に適用するスコア条件
        cards: Verifierに渡された全候補カード
        candidate_ids: 基準編成に含まれるカードID

    Returns:
        基準編成の合計点
    """
    selected_ids = set(candidate_ids)
    selected_cards = [card for card in cards if card.id in selected_ids]
    support_by_card = _score_support_by_card(problem, cards, selected_ids)
    support = {parameter_type: 0 for parameter_type in PARAMETER_TYPES}
    for card in selected_cards:
        support[card.parameter_type] += support_by_card[card.id]

    total_percent = {
        parameter_type: problem.outside_param_bonus_percent[parameter_type]
        + sum((card.param_bonus_percent[parameter_type] for card in selected_cards), Fraction(0))
        for parameter_type in PARAMETER_TYPES
    }
    param_bonus = {parameter_type: 0 for parameter_type in PARAMETER_TYPES}
    for row in problem.parameter_bonus_rows:
        for parameter_type in PARAMETER_TYPES:
            row_value = Fraction(row[parameter_type]) * total_percent[parameter_type] / 100
            param_bonus[parameter_type] += floor(row_value)

    score = 0
    for parameter_type in PARAMETER_TYPES:
        value = problem.non_support_params[parameter_type] + support[parameter_type] + param_bonus[parameter_type]
        score += min(value, problem.param_cap) if problem.param_cap is not None else value
    return score


def _floor_variable(
    model: cp_model.CpModel,
    numerator: Any,
    denominator: int,
    minimum_numerator: int,
    maximum_numerator: int,
    name: str,
) -> cp_model.IntVar:
    """分子を分母で割ったパラボ点を切り捨て、整数点の変数にする

    Args:
        model: 制約を追加するCP-SATモデル
        numerator: パラボ点の分子となる整数式
        denominator: パラボ点の分母となる正の整数
        minimum_numerator: 分子が取りうる最小値
        maximum_numerator: 分子が取りうる最大値
        name: 作成する整数変数の名前

    Returns:
        分数の床関数を表す整数変数

    Raises:
        ValueError: denominatorが正でない場合
    """
    if denominator < 1:
        raise ValueError(f"{name} denominator must be positive")
    # CP-SATは整数演算だけなので、分数の割り算を商の上下限制約へ置き換える
    # `//`は負の値でも数学上の床（Math.floorと同じ）を使い、整数変数の範囲を決める
    result = model.new_int_var(
        minimum_numerator // denominator,
        maximum_numerator // denominator,
        name,
    )
    model.add(result * denominator <= numerator)
    model.add(numerator <= result * denominator + denominator - 1)
    return result


def _score_expression(
    model: cp_model.CpModel,
    problem: Problem,
    cards: list[Card],
    selected: dict[str, cp_model.IntVar],
) -> Any:
    """選択変数から合計点の式を作り、パラメータ上限まで反映する

    Args:
        model: スコア変数と制約を追加するCP-SATモデル
        problem: 編成制約とスコア計算の前提値
        cards: Verifierに渡された全候補カード
        selected: カードIDごとの選択Bool変数

    Returns:
        Solverが最大化する整数スコア式
    """
    support_terms: dict[str, list[Any]] = {parameter_type: [] for parameter_type in PARAMETER_TYPES}
    support_bounds = {parameter_type: [0, 0] for parameter_type in PARAMETER_TYPES}

    for card_index, card in enumerate(cards):
        selection = selected[card.id]
        parameter_type = card.parameter_type
        base_score = card.base_score_without_param_bonus
        support_terms[parameter_type].append(base_score * selection)
        # カード点が負の場合も含め、スコア式を囲む変数範囲を計算する
        support_bounds[parameter_type][0] += min(0, base_score)
        support_bounds[parameter_type][1] += max(0, base_score)

        for ability_index, ability in enumerate(card.synergy_abilities):
            providers = [
                (other_card, other_card.provided_actions.get(ability.action_id, 0))
                for other_card in cards
                if other_card.name != card.name and other_card.provided_actions.get(ability.action_id, 0) > 0
            ]
            # selectedはカードごとの0/1変数。選ばれた提供カードだけ回数を足し合わせる。
            provider_count = sum(count * selected[other_card.id] for other_card, count in providers)
            possible_count_by_name: dict[str, int] = {}
            for other_card in cards:
                if other_card.name == card.name:
                    continue
                possible_count_by_name[other_card.name] = max(
                    possible_count_by_name.get(other_card.name, 0),
                    other_card.provided_actions.get(ability.action_id, 0),
                )
            maximum_other_count = sum(
                sorted(possible_count_by_name.values(), reverse=True)[: max(0, problem.unit_size - 1)]
            )
            remaining_count = (
                maximum_other_count
                if ability.max_count is None
                else min(maximum_other_count, max(0, ability.max_count - ability.used_count))
            )
            # 発動回数の各段階で増える点をBool変数に割り当て、選択状態に応じて合計する
            for threshold in range(1, remaining_count + 1):
                bonus = floor(ability.parsed_value * threshold)
                previous = floor(ability.parsed_value * (threshold - 1))
                delta = bonus - previous
                if delta == 0:
                    continue
                active = model.new_bool_var(f"synergy_{card_index}_{ability_index}_{threshold}")
                # activeは、受け手カードが選ばれ提供回数がthreshold以上になった段階を表す
                model.add(active <= selection)
                # only_enforce_ifは、activeが1の場合にだけこの制約を有効にする
                model.add(provider_count >= threshold).only_enforce_if(active)
                # 受け手が選択済みでactiveが0なら、提供回数はthreshold未満になる
                model.add(provider_count <= threshold - 1).only_enforce_if([selection, active.Not()])
                support_terms[parameter_type].append(delta * active)
                support_bounds[parameter_type][0] += min(0, delta)
                support_bounds[parameter_type][1] += max(0, delta)

    for parameter_type in PARAMETER_TYPES:
        outside_percent = problem.outside_param_bonus_percent[parameter_type]
        card_percents = [card.param_bonus_percent[parameter_type] for card in cards]
        # 分母を4にそろえ、2.5%と1.25%の合計3.75%を小数誤差なく整数係数で表す
        scale = lcm(outside_percent.denominator, *(value.denominator for value in card_percents))
        if 100 * scale > INT64_LIMIT:
            raise ValueError(f"parameter bonus scale for {parameter_type} exceeds CP-SAT integer range")
        outside_scaled = outside_percent.numerator * (scale // outside_percent.denominator)
        scaled_coefficients = [value.numerator * (scale // value.denominator) for value in card_percents]
        # 各カードの選択変数が0/1なので、選ばれたカード分だけパーセントが加算される
        total_percent_scaled = outside_scaled + sum(
            coefficient * selected[card.id] for card, coefficient in zip(cards, scaled_coefficients, strict=True)
        )
        total_percent_min = outside_scaled + sum(min(0, value) for value in scaled_coefficients)
        total_percent_max = outside_scaled + sum(max(0, value) for value in scaled_coefficients)

        for row_index, row in enumerate(problem.parameter_bonus_rows):
            row_value = row[parameter_type]
            row_numerator = row_value * total_percent_scaled
            possible_numerators = (row_value * total_percent_min, row_value * total_percent_max)
            bonus_variable = _floor_variable(
                model,
                row_numerator,
                100 * scale,
                min(possible_numerators),
                max(possible_numerators),
                f"param_bonus_{parameter_type}_{row_index}",
            )
            support_terms[parameter_type].append(bonus_variable)
            support_bounds[parameter_type][0] += min(possible_numerators) // (100 * scale)
            support_bounds[parameter_type][1] += max(possible_numerators) // (100 * scale)

    total_scores: list[Any] = []
    for parameter_type in PARAMETER_TYPES:
        uncapped = problem.non_support_params[parameter_type] + sum(support_terms[parameter_type], 0)
        minimum, maximum = support_bounds[parameter_type]
        minimum += problem.non_support_params[parameter_type]
        maximum += problem.non_support_params[parameter_type]
        cap = problem.param_cap
        if cap is None:
            total_scores.append(uncapped)
        elif minimum >= cap:
            total_scores.append(cap)
        elif maximum <= cap:
            total_scores.append(uncapped)
        else:
            capped = model.new_int_var(min(minimum, cap), min(maximum, cap), f"capped_{parameter_type}")
            is_capped = model.new_bool_var(f"is_capped_{parameter_type}")
            model.add(uncapped >= cap).only_enforce_if(is_capped)
            model.add(uncapped <= cap - 1).only_enforce_if(is_capped.Not())
            model.add(capped == cap).only_enforce_if(is_capped)
            model.add(capped == uncapped).only_enforce_if(is_capped.Not())
            total_scores.append(capped)
    return sum(total_scores, 0)


def _read_positive_integer_env(name: str, default: int) -> int:
    """環境変数を正の整数として読み取る

    Args:
        name: 読み取る環境変数名
        default: 環境変数が未指定または空の場合に返す値

    Returns:
        環境変数の整数値、またはdefault

    Raises:
        ValueError: 値が整数でないか、1未満の場合
    """
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    parsed = int(value)
    if parsed < 1:
        raise ValueError(f"{name} must be a positive integer")
    return parsed


def verify_optimizer(payload: Any) -> dict[str, Any]:
    """候補の点数を再計算し、CP-SATで最適点と編成を求める

    Args:
        payload: TypeScript側から受け取ったVerifier用JSON値

    Returns:
        判定状態、最適性、最大点、編成を含むJSON互換辞書

    Raises:
        ValueError: 入力の形式や値がVerifierの契約に合わない場合
    """
    started = perf_counter()
    problem, cards, candidate = _load_problem(payload)
    invalid_candidate = _candidate_is_legal(problem, cards, candidate)
    if invalid_candidate:
        return {"status": "invalid_candidate", "message": invalid_candidate}

    # 先にアプリ結果の点数を独立計算し、入力条件や点数モデルの食い違いを分けて報告する
    modeled_candidate_score = _score_candidate(problem, cards, candidate.card_ids)
    if modeled_candidate_score != candidate.score:
        return {
            "status": "score_mismatch",
            "candidateScore": candidate.score,
            "modeledCandidateScore": modeled_candidate_score,
        }

    model = cp_model.CpModel()
    selected = {card.id: model.new_bool_var(f"selected_{index}") for index, card in enumerate(cards)}
    rental_selected: dict[str, cp_model.IntVar] = {}
    for index, card in enumerate(cards):
        if not card.rental_allowed:
            continue
        if card.normal_allowed:
            rental = model.new_bool_var(f"rental_{index}")
            # レンタル枠フラグだけが立ち、カード自体は編成に入らない状態を防ぐ
            model.add(rental <= selected[card.id])
        else:
            rental = selected[card.id]
        rental_selected[card.id] = rental

    # チーム枚数とレンタル枠を固定し、保存された条件カードも編成へ含める
    model.add(sum(selected.values()) == problem.unit_size)
    model.add(sum(rental_selected.values()) == 1)
    for card_id in problem.fixed_card_ids:
        model.add(selected[card_id] == 1)
    for card_id in problem.fixed_rental_card_ids:
        model.add(rental_selected[card_id] == 1)

    cards_by_name: dict[str, list[Card]] = {}
    for card in cards:
        cards_by_name.setdefault(card.name, []).append(card)
    # 同名の通常・レンタル候補は別IDでも同じカードなので、同時選択を禁止する
    for variants in cards_by_name.values():
        if len(variants) > 1:
            model.add(sum(selected[card.id] for card in variants) <= 1)

    for parameter_type in PARAMETER_TYPES:
        type_selections = [selected[card.id] for card in cards if card.type == parameter_type]
        model.add(sum(type_selections) >= problem.type_count_min[parameter_type])
        model.add(sum(type_selections) <= problem.type_count_max[parameter_type])
        sp_selections = [selected[card.id] for card in cards if card.sp_category in (parameter_type, "all")]
        model.add(sum(sp_selections) >= problem.sp_constraint[parameter_type])

    # ここで作る式がCP-SATの最大化対象。カード点・シナジー・パラボ・上限を含む。
    score = _score_expression(model, problem, cards, selected)
    candidate_ids = set(candidate.card_ids)
    rental_card_id = candidate.rental_card_id
    # 既知の候補編成をヒントとして渡し、探索の初期解を見つけやすくする。選択を固定する制約ではない。
    for card in cards:
        model.add_hint(selected[card.id], int(card.id in candidate_ids))
    # レンタル枠を選べるカードには、基準編成でのレンタル状態も初期案として渡す
    for card in cards:
        if card.rental_allowed and card.normal_allowed:
            model.add_hint(rental_selected[card.id], int(card.id == rental_card_id))
    # 選んだ編成のスコア式が最大になるように探索する
    model.maximize(score)
    validation_error = model.validate()
    if validation_error:
        return {"status": "model_invalid", "message": validation_error}

    worker_count = _read_positive_integer_env("GAKU_NAVI_CP_SAT_SEARCH_WORKERS", 8)
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = candidate.timeout_ms / 1000
    solver.parameters.num_search_workers = worker_count
    check_started = perf_counter()
    status = solver.solve(model)
    solver_elapsed_ms = round((perf_counter() - check_started) * 1000, 3)
    common_result = {
        "candidateScore": candidate.score,
        "solverElapsedMs": solver_elapsed_ms,
        "totalElapsedMs": round((perf_counter() - started) * 1000, 3),
        "numSearchWorkers": worker_count,
    }

    if status == cp_model.INFEASIBLE:
        return {
            "status": "no_legal_lineup",
            "message": "The constraints have no legal lineup, despite the candidate passing validation",
            **common_result,
        }
    if status == cp_model.UNKNOWN:
        return {"status": "unknown", "reason": "time_or_search_limit", **common_result}
    if status == cp_model.MODEL_INVALID:
        return {"status": "model_invalid", "message": solver.response_stats(), **common_result}
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {"status": "solver_error", "solverStatus": solver.status_name(status), **common_result}

    card_by_id = {card.id: card for card in cards}
    best_ids = [card.id for card in cards if solver.boolean_value(selected[card.id])]
    best_support_by_card = _score_support_by_card(problem, cards, set(best_ids))
    best_rental_ids = [card_id for card_id, rental in rental_selected.items() if solver.boolean_value(rental)]
    # 最終点は上で定義したスコア式を、Solverが選んだカードで評価した値
    best_score = solver.value(score)
    best_rental_id_set = set(best_rental_ids)
    best_lineup = [
        {
            "cardId": card_id,
            "name": card_by_id[card_id].name,
            "type": card_by_id[card_id].type,
            "parameterType": card_by_id[card_id].parameter_type,
            "isRental": card_id in best_rental_id_set,
        }
        for card_id in best_ids
    ]
    is_proven_optimal = status == cp_model.OPTIMAL
    has_better_lineup = best_score > candidate.score
    result_status = "non_optimal" if has_better_lineup else "optimal" if is_proven_optimal else "unknown"
    objective_bound = solver.best_objective_bound
    return {
        "status": result_status,
        "solverStatus": solver.status_name(status),
        "optimalityProven": is_proven_optimal,
        "optimalScore": best_score if is_proven_optimal else None,
        "bestKnownScore": best_score,
        "bestObjectiveBound": int(objective_bound) if objective_bound.is_integer() else objective_bound,
        "bestLineup": best_lineup,
        "bestLineupCardScores": best_support_by_card,
        "bestCardIds": best_ids,
        "bestRentalCardId": best_rental_ids[0] if best_rental_ids else None,
        "scoreDifference": best_score - candidate.score,
        **common_result,
    }
