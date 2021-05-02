import fs from 'fs'
import path from 'path'

import { api } from './api'

export default async function getData() {
  const { data } = await api.get('configuration')
  fs.writeFileSync(path.resolve(__dirname, './images-cache.json'), JSON.stringify(data, null, 2))
}