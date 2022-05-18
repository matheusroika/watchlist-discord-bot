import { NextFunction, Request, Response } from 'express'

export default function authHandler (req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${process.env.API_KEY}`) {
    res.status(403).json({ error: 'Wrong or missing credentials' })
    return
  }

  next()
}