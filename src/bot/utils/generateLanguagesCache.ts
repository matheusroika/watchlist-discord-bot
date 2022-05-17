import fs from 'fs'
import path from 'path'

import { api } from '../../services/api'

export default async function getData() {
  const { data } = await api.get('/configuration/primary_translations')
  fs.writeFileSync(path.resolve(__dirname, '../cache/languagesCache.json'), JSON.stringify(data, null, 2))
}