import { Router } from 'express';
import multer from 'multer';
import { extraerDatosFactura } from '../services/anthropic.js';
import { logger } from '../utils/logger.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(
      file.mimetype
    );
    if (!ok) return cb(new Error('Formato no soportado. Use PDF, JPG, PNG o WebP.'));
    cb(null, true);
  },
});

const router = Router();

router.post('/procesar', upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No se recibió archivo');
      err.status = 400;
      err.publicMessage = 'Adjunta una factura en PDF o imagen.';
      throw err;
    }

    logger.info(
      { mimetype: req.file.mimetype, size: req.file.size },
      'Procesando factura'
    );

    const datos = await extraerDatosFactura({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });

    res.json({ ok: true, datos });
  } catch (err) {
    next(err);
  }
});

export default router;
