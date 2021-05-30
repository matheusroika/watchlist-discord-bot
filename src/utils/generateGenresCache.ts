import fs from 'fs'
import path from 'path'

import { api } from '../services/api'

const tmdbLanguages = require('../../cache/languagesCache.json')

export default async function getData() {
  const availableLanguagesFileName = fs.readdirSync(path.resolve(__dirname, '../../languages'))
  const availableLanguages = availableLanguagesFileName.map(language => language.replace(/.json$/, ''))
  
  availableLanguages.forEach(async language => {
    if (tmdbLanguages.includes(language)) {
      const { data } = await api.get('genre/movie/list', { params: {language} })
      fs.writeFileSync(path.resolve(__dirname, `../../cache/genresCache_${language}.json`), JSON.stringify(data, null, 2))
    }
  })
}