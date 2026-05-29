import type { NextFunction, Request, RequestHandler, Response } from 'express'

export class HttpError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export const asyncHandler = (
  handler: (request: Request, response: Response) => Promise<void>,
): RequestHandler => {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response).catch(next)
  }
}
