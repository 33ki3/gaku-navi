/** テストで使うカードマスタを、ブラウザ起動時と同じ初期化経路へ渡す */
import { initializeCards } from '../data/card/cards'
import rawCards from '../data/json/cards.json'
import { initializeI18n } from '../i18n'
import ja from '../i18n/locales/ja.json'

initializeCards(rawCards)
await initializeI18n(ja)
