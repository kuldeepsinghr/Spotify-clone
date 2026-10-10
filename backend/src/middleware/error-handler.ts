import { rm } from 'node:fs/promises'
import { Prisma } from '@prisma/client'
import type { ErrorRequestHandler, Request, RequestHandler } from 'express'
import multer from 'multer'
import { AppError, ErrorCode } from '../shared/errors.js'

interface BodyParserError {
  type: string
  status: number
}

const isBodyParserError = (error: unknown): error is BodyParserError =>
  typeof error === 'object' && error !== null && 'type' in error && 'status' in error

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error

  if (error instanceof multer.MulterError) {
    return error.code === 'LIMIT_FILE_SIZE'
      ? new AppError(413, ErrorCode.PAYLOAD_TOO_LARGE, 'File is too large')
      : new AppError(400, ErrorCode.VALIDATION_ERROR, error.message)
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2025':
        return new AppError(404, ErrorCode.NOT_FOUND, 'Resource not found')
      case 'P2002':
        return new AppError(409, ErrorCode.CONFLICT, 'A record with these values already exists')
      case 'P2003':
        return new AppError(
          409,
          ErrorCode.CONFLICT,
          'The record is still referenced by other records',
        )
    }
  }

  if (isBodyParserError(error)) {
    if (error.type === 'entity.parse.failed') {
      return new AppError(400, ErrorCode.MALFORMED_JSON, 'Request body is not valid JSON')
    }
    if (error.type === 'entity.too.large') {
      return new AppError(413, ErrorCode.PAYLOAD_TOO_LARGE, 'Request body is too large')
    }
  }

  return new AppError(500, ErrorCode.INTERNAL_ERROR, 'Something went wrong')
}

function uploadedFiles(req: Request): Express.Multer.File[] {
  if (req.file) return [req.file]
  if (Array.isArray(req.files)) return req.files
  return req.files ? Object.values(req.files).flat() : []
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = toAppError(error)
  if (appError.status >= 500) req.log.error({ err: error }, 'request failed')

  for (const file of uploadedFiles(req)) void rm(file.path, { force: true })

  // Stack traces and internal messages never leave the server.
  res.status(appError.status).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined && { details: appError.details }),
    },
  })
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, ErrorCode.NOT_FOUND, `No route for ${req.method} ${req.path}`))
}
