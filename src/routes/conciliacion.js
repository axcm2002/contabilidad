import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const movimientoSchema = z.object({
  fecha: z.string(), // YYYY-MM-DD
  descripcion: z.string().optional().default(''),
  monto: z.number(),
});

const facturaSchema = z.object({
  id: z.string(),
  proveedor: z.string().nullable().optional(),
  fecha_emision: z.string().nullable().optional(),
  monto_total: z.number().nullable().optional(),
});

const bodySchema = z.object({
  movimientos: z.array(movimientoSchema),
  facturas: z.array(facturaSchema),
  toleranciaDias: z.number().int().min(0).max(30).optional().default(5),
});

function diffDias(a, b) {
  const A = new Date(a).getTime();
  const B = new Date(b).getTime();
  return Math.abs(Math.round((A - B) / (1000 * 60 * 60 * 24)));
}

router.post('/cruzar', (req, res, next) => {
  try {
    const { movimientos, facturas, toleranciaDias } = bodySchema.parse(req.body);

    const facturasUsables = facturas.filter(
      (f) => f.fecha_emision && typeof f.monto_total === 'number'
    );

    const matches = [];
    const facturasUsadas = new Set();
    const movimientosSinMatch = [];

    for (const mov of movimientos) {
      const candidatos = facturasUsables
        .filter((f) => !facturasUsadas.has(f.id))
        .filter((f) => Math.round(f.monto_total) === Math.round(Math.abs(mov.monto)))
        .map((f) => ({ factura: f, dias: diffDias(f.fecha_emision, mov.fecha) }))
        .filter((c) => c.dias <= toleranciaDias)
        .sort((a, b) => a.dias - b.dias);

      if (candidatos.length > 0) {
        const best = candidatos[0];
        facturasUsadas.add(best.factura.id);
        matches.push({
          movimiento: mov,
          factura: best.factura,
          diferenciaDias: best.dias,
        });
      } else {
        movimientosSinMatch.push(mov);
      }
    }

    const facturasSinMatch = facturasUsables.filter((f) => !facturasUsadas.has(f.id));

    res.json({
      ok: true,
      resumen: {
        totalMovimientos: movimientos.length,
        totalFacturas: facturas.length,
        matches: matches.length,
        movimientosSinMatch: movimientosSinMatch.length,
        facturasSinMatch: facturasSinMatch.length,
      },
      matches,
      movimientosSinMatch,
      facturasSinMatch,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      err.status = 400;
      err.publicMessage = 'Datos inválidos en la solicitud.';
    }
    next(err);
  }
});

export default router;
