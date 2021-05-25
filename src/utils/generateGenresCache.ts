import fs from 'fs'
import path from 'path'

import { api } from '../services/api'

export default async function getData() {
  const { data } = await api.get('genre/movie/list', { params: {language: 'pt-BR'} })
  fs.writeFileSync(path.resolve(__dirname, '../../cache/genresCache.json'), JSON.stringify(data, null, 2))
}