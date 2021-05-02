import fs from 'fs'
import path from 'path'

import { api } from './api'

export default async function getData() {
  const { data } = await api.get('genre/movie/list', { params: {language: 'pt-BR'} })
  fs.writeFileSync(path.resolve(__dirname, './genres-cache.json'), JSON.stringify(data, null, 2))
}