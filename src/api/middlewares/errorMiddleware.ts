import { NextFunction, Request, Response } from 'express'

export default function errorHandler (err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err?.statusCode || 500
  console.error(err)
  res.status(statusCode).json({ message: 'Something went wrong' })

  return
}