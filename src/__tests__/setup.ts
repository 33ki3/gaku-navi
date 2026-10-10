/** テストで使うカードマスタを、ブラウザ起動時と同じ初期化経路へ渡す */
import { initializeCards } from '../data/card/cards'
import { initializePIdols } from '../data/pIdol'
import rawCards from '../data/json/cards.json'
import rawPIdols from '../data/json/pIdol.json'
import { initializeI18n } from '../i18n'
import ja from '../i18n/locales/ja.json'

initializeCards(rawCards)
initializePIdols(rawPIdols)
await initializeI18n(ja)
