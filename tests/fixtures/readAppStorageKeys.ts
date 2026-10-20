/** PlaywrightのNodeプロセスから、アプリが宣言するlocalStorageキーを読み取る */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import ts from 'typescript'

/** E2Eで使うアプリ側のlocalStorageキー */
interface AppStorageKeys {
  scoreSettings: string
  scheduleSelections: string
  unitSettings: string
  uncaps: string
  achievementCalculator: string
}

/** Viteのimport.meta.envを実行せず、common.tsの文字列定数だけを取り出す */
export function readAppStorageKeys(): AppStorageKeys {
  const sourcePath = path.join(process.cwd(), 'src', 'constant', 'common.ts')
  const source = ts.createSourceFile(sourcePath, readFileSync(sourcePath, 'utf8'), ts.ScriptTarget.Latest, true)
  const declarations = source.statements.flatMap((statement) =>
    ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [],
  )

  function readStringConstant(name: string): string {
    const declaration = declarations.find(
      (candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === name,
    )
    const initializer = declaration?.initializer
    if (!initializer || !ts.isStringLiteral(initializer)) {
      throw new Error(`Expected ${name} to be a string constant in ${sourcePath}`)
    }
    return initializer.text
  }

  return {
    scoreSettings: readStringConstant('SCORE_SETTINGS_STORAGE_KEY'),
    scheduleSelections: readStringConstant('SCHEDULE_SELECTIONS_STORAGE_KEY'),
    unitSettings: readStringConstant('UNIT_SIMULATOR_STORAGE_KEY'),
    uncaps: readStringConstant('UNCAP_STORAGE_KEY'),
    achievementCalculator: readStringConstant('ACHIEVEMENT_CALCULATOR_STORAGE_KEY'),
  }
}
