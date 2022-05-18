import { NextFunction, Request, Response } from 'express'

import Server from '../../models/Server'

export default {
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const servers = await Server.find()
  
      res.status(200).json(servers)    
    } catch (err) {
      console.error('Error getting all servers', err)
      next(err)
    }
  },

  getOne: async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id
  
    try {
      const server = await Server.findOne({serverId: id})
  
      if (!server) {
        res.status(422).json({ message: 'Server not found' })
        return
      }
  
      res.status(200).json(server)    
    } catch (err) {
      console.error('Error getting one server', err)
      next(err)
    }
  }
}