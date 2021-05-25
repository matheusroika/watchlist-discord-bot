import cron from 'node-cron'

import generateImagesCache from './utils/generateImagesCache'
import generateGenresCache from './utils/generateGenresCache'

cron.schedule('0 0 * * 0', async () => {
  await generateImagesCache()
  await generateGenresCache()
})