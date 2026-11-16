/**
 * Global Error Handler Middleware
 * Centralizes error handling across the application
 */

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    status: err.status || 500,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Set default status and message
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Determine if we should show stack trace (development only)
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Build error response
  const errorResponse = {
    error: {
      status,
      message,
      ...(isDevelopment && { stack: err.stack }),
      ...(isDevelopment && { details: err.details })
    }
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.error.status = 400;
    errorResponse.error.message = 'Validation Error';
    errorResponse.error.fields = err.fields;
  }

  if (err.name === 'UnauthorizedError') {
    errorResponse.error.status = 401;
    errorResponse.error.message = 'Unauthorized';
  }

  if (err.name === 'ForbiddenError') {
    errorResponse.error.status = 403;
    errorResponse.error.message = 'Forbidden';
  }

  if (err.name === 'NotFoundError') {
    errorResponse.error.status = 404;
    errorResponse.error.message = 'Not Found';
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    errorResponse.error.status = 500;
    errorResponse.error.message = isDevelopment ? err.message : 'Database Error';
  }

  // Handle duplicate key error (MongoDB)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    errorResponse.error.status = 409;
    errorResponse.error.message = `Duplicate value for field: ${field}`;
  }

  res.status(errorResponse.error.status).json(errorResponse);
};

/**
 * Async error wrapper - wrap route handlers to catch async errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
