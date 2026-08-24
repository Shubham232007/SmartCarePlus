import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🔥 Global Server Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error occurred.';
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    ...(ENV.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
