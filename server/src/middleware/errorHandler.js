import { ApiError } from '../utils/ApiError.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// The single place where every error becomes a JSON response: { success: false, error: { message, details } }
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err instanceof ApiError ? err.status : 500;
  let message = err.message;
  let details = err.details;

  if (err.type === 'entity.too.large') {
    status = 413;
    message = 'The request is too large. The maximum size is 1 MB.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with this value already exists.';
  } else if (err.name === 'CastError' || err.name === 'ValidationError') {
    status = 400;
    message = 'Some of the submitted data is invalid.';
  }

  if (status >= 500) {
    console.error(err); // full details only in the server log
    message = 'Something went wrong on the server. Please try again.';
    details = undefined;
  }
  res.status(status).json({ success: false, error: { message, details } });
}
