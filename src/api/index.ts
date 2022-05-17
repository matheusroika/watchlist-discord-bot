import express from 'express'

import Server from '../models/Server'

const port = process.env.PORT || 3333
const app = express()

app.get("/server", async (req, res) => {
  try {
    const servers = await Server.find()

    res.status(200).json(servers)    
  } catch (error) {
    res.status(500).json({ error })
  }
})

app.listen(port)