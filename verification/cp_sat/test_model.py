"""CP-SAT verifierの最大スコアと編成出力を確認する"""

import unittest

from model import verify_optimizer


def make_card(card_id: str, score: int, *, param_bonus: float = 0) -> dict:
    """スコア差を比較する単純なレンタルカードを作る"""
    return {
        "id": card_id,
        "name": card_id,
        "type": "vocal",
        "parameterType": "vocal",
        "spCategory": "none",
        "normalAllowed": False,
        "rentalAllowed": True,
        "baseScoreWithoutParamBonus": score,
        "paramBonusPercent": {"vocal": param_bonus, "dance": 0, "visual": 0},
        "providedActions": {},
        "synergyAbilities": [],
    }


def make_payload(candidate_id: str, candidate_score: int) -> dict:
    """1枠へ2枚のレンタル候補を入れた、最小のCP-SAT入力を作る"""
    return {
        "payloadVersion": 1,
        "problem": {
            # 6枚チームのルールではなく、候補比較だけを試す1枠の縮小fixture
            "unitSize": 1,
            "typeCountMin": {"vocal": 0, "dance": 0, "visual": 0},
            "typeCountMax": {"vocal": 1, "dance": 1, "visual": 1},
            "spConstraint": {"vocal": 0, "dance": 0, "visual": 0},
            "outsideParamBonusPercent": {"vocal": 0, "dance": 0, "visual": 0},
            "parameterBonusRows": [{"vocal": 100, "dance": 0, "visual": 0}],
            "nonSupportParams": {"vocal": 0, "dance": 0, "visual": 0},
            "paramCap": None,
            "fixedCardIds": [],
            "fixedRentalCardIds": [],
        },
        # 1枚だけ選ぶ。rental-highは基礎9点に、100×1.5%を切り捨てた1点が加わる
        "cards": [make_card("rental-low", 0), make_card("rental-high", 9, param_bonus=1.5)],
        "candidate": {
            "cardIds": [candidate_id],
            "rentalCardId": candidate_id,
            "score": candidate_score,
        },
        "timeoutMs": 5_000,
    }


class VerifyOptimizerTests(unittest.TestCase):
    """小さな入力でVerifierの判定と最適編成を確認する。"""

    def test_reports_a_higher_lineup_by_name_and_score(self) -> None:
        """候補より高得点のレンタル編成と点数を返す。"""
        result = verify_optimizer(make_payload("rental-low", 0))

        self.assertEqual(result["status"], "non_optimal")
        self.assertTrue(result["optimalityProven"])
        self.assertEqual(result["optimalScore"], 10)
        self.assertEqual(result["bestKnownScore"], 10)
        self.assertEqual(
            result["bestLineup"],
            [
                {
                    "cardId": "rental-high",
                    "name": "rental-high",
                    "type": "vocal",
                    "parameterType": "vocal",
                    "isRental": True,
                }
            ],
        )

    def test_proves_the_candidate_is_optimal_when_no_better_lineup_exists(self) -> None:
        """より高得点の編成がないとき、候補を最適と証明する。"""
        result = verify_optimizer(make_payload("rental-high", 10))

        self.assertEqual(result["status"], "optimal")
        self.assertTrue(result["optimalityProven"])
        self.assertEqual(result["optimalScore"], 10)
        self.assertEqual(result["bestLineup"][0]["cardId"], "rental-high")


if __name__ == "__main__":
    unittest.main()
