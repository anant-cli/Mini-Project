export const errorHandler = (err, req, res, next) => {
  console.error(err);

  // zod's schema.parse() throws a ZodError (no .status property) whenever
  // req.body/req.query fails validation — e.g. a malformed email or a
  // password under 8 characters on login/signup. Without this check that
  // error falls through to the generic 500 below instead of a proper 400,
  // which is exactly what turns an ordinary bad-input case into a fake
  // "server crashed" response.
  if (err.name === 'ZodError') {
    const message = err.issues?.[0]?.message || 'Invalid request data';
    return res.status(400).json({
      error: message,
      details: err.issues?.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
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
