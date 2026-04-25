import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error({ err, path: req.path }, 'Request error');
  const status = err.status || 500;
  res.status(status).json({
    error: err.publicMessage || 'Error interno del servidor',
  });
}
