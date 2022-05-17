import fs from 'fs'
import path from 'path'

import { api } from '../../services/api'

import availableLanguages from './getAvailableLanguages'
const tmdbLanguages = require('../cache/languagesCache.json')

export default async function getData() {  
  availableLanguages.forEach(async language => {
    if (tmdbLanguages.includes(language)) {
      const { data } = await api.get('genre/movie/list', { params: {language} })
      fs.writeFileSync(path.resolve(__dirname, `../cache/genresCache_${language}.json`), JSON.stringify(data, null, 2))
    }
  })
}