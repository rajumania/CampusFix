import multer from 'multer';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

/**
 * Single place where library-level failures (duplicate keys, bad ObjectIds,
 * multer limits) are translated into the API's standard error body, so every
 * endpoint fails the same way and internal messages never reach the client.
 */
export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 5 MB or smaller'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'You can attach at most 5 images'
          : err.message;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = 'Validation failed';
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value "${err.value}" for field "${err.path}"`;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'That value is already taken';
    details = err.keyValue;
  }

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    if (env.isProd) message = 'Internal server error';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
  });
}
