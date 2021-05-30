import cron from 'node-cron'

import generateLanguagesCache from './utils/generateLanguagesCache'
import generateImagesCache from './utils/generateImagesCache'
import generateGenresCache from './utils/generateGenresCache'

//0 * * * * * Every minute
//0 0 * * 0 Every Sunday at 00:00
cron.schedule('0 0 * * 0', async () => {
  await generateLanguagesCache()
  await generateImagesCache()
  await generateGenresCache()
})