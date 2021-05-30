import fs from 'fs'
import path from 'path'

const availableLanguages = fs.readdirSync(path.resolve(__dirname, '../languages'))
  .map(language => language.replace(/.json$/, ''))

export default availableLanguages