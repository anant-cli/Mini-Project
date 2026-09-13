export const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'ZodError') {
    const message = err.issues?.[0]?.message || 'Invalid request data';
    return res.status(400).json({
      error: message,
      details: err.issues?.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }

  const status = err.status || 500;
  const isKnownError = Boolean(err.status);
  const safeMessage = isKnownError || process.env.NODE_ENV !== 'production'
    ? err.message || 'Internal server error'
    : 'Something went wrong on our end. Please try again.';

  res.status(status).json({
    error: safeMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

export const notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
