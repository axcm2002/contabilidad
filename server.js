import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from './src/utils/logger.js';
import { errorHandler } from './src/middleware/error.js';
import facturasRouter from './src/routes/facturas.js';
import conciliacionRouter from './src/routes/conciliacion.js';
// import stripeRouter from './src/routes/stripe.js'; // descomentar cuando se activen pagos

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Seguridad
app.use(
  helmet({
    contentSecurityPolicy: false, // deshabilitado para servir el SPA buildeado sin fricciones
  })
);
app.use(cors());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Body parsers (Stripe webhook necesita raw body, por eso va antes y separado)
// app.use('/webhooks/stripe', stripeRouter);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), env: process.env.NODE_ENV });
});

// API
app.use('/api/facturas', facturasRouter);
app.use('/api/conciliacion', conciliacionRouter);

// Servir frontend buildeado en producción
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') return next();
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) next();
  });
});

// Error handler centralizado
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, 'Server listening');
});
