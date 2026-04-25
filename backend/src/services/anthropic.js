import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-6';
// Para reducir costos a la mitad o más, cambiar por: 'claude-haiku-4-5-20251001'

const PROMPT_EXTRACCION = `Eres un asistente experto en extracción de datos de facturas chilenas.

Analiza la factura adjunta y devuelve EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin explicaciones, sin texto antes o después) con esta estructura exacta:

{
  "proveedor": "Razón social del emisor",
  "rut_proveedor": "RUT en formato 12.345.678-9",
  "numero_factura": "Folio o número del documento",
  "fecha_emision": "YYYY-MM-DD",
  "monto_neto": 0,
  "iva": 0,
  "monto_total": 0,
  "moneda": "CLP",
  "categoria": "Una de: Insumos, Servicios, Arriendo, Combustible, Tecnología, Marketing, Profesionales, Mantención, Otros",
  "items_count": 0,
  "confianza": 0.0
}

Reglas:
- Todos los montos en pesos chilenos (CLP) sin puntos ni comas, solo el número entero.
- Si un campo no es legible, usa null.
- "confianza" es un número entre 0 y 1 que representa qué tan seguro estás de la extracción global.
- "categoria" debe ser una de las opciones listadas, eligiendo la más cercana al rubro del proveedor o los items.
- "items_count" es la cantidad de líneas de detalle en la factura.

Devuelve SOLO el JSON, nada más.`;

export async function extraerDatosFactura({ buffer, mimeType }) {
  const base64 = buffer.toString('base64');

  const isPDF = mimeType === 'application/pdf';
  const sourceBlock = isPDF
    ? {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      }
    : {
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: base64 },
      };

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [sourceBlock, { type: 'text', text: PROMPT_EXTRACCION }],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('La API no devolvió texto');

  // Limpiar fences si el modelo decidió añadirlos pese a la instrucción
  const cleaned = textBlock.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const err = new Error('No se pudo parsear la respuesta de la IA');
    err.status = 502;
    err.publicMessage = 'La IA devolvió un formato inesperado. Intenta de nuevo.';
    throw err;
  }
}
