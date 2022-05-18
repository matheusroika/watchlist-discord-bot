import express from 'express'

import serverController from '../controllers/serverController'

const serverRouter = express.Router()

serverRouter.get('/', serverController.getAll)
serverRouter.get('/:id', serverController.getOne)

export default serverRouter