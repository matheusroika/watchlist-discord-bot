import express from 'express'
import bodyParser from 'body-parser'
import helmet from 'helmet'

import serverRouter from './routes/serverRoutes'
import errorMiddleware from './middlewares/errorMiddleware'
import authMiddleware from './middlewares/authMiddleware'

const app = express()
const port = process.env.PORT || 3333

app.use(helmet())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(errorMiddleware)
app.use(authMiddleware)

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Watchlister API' })
})

app.use('/api/server', serverRouter)

app.listen(port, () => {
  console.log(`API running on port ${port}`)
})