import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-6';
// Para reducir costos a la mitad, cambiar por: 'claude-haiku-4-5-20251001'

const PROMPT_FACTURA = `Eres un experto en facturas y documentos tributarios chilenos (DTE). Analiza esta imagen y extrae los datos en JSON. Si no es una factura/boleta o no podes leer claramente, responde con {"error": "explicación breve"}.

Estructura JSON requerida (respeta los nombres de keys exactamente):
{
  "tipo_documento": "Factura electrónica" | "Boleta electrónica" | "Nota de crédito" | "Nota de débito" | "Guía de despacho" | "Factura exenta" | otro,
  "folio": "número del documento como string",
  "fecha": "YYYY-MM-DD",
  "emisor": {
    "rut": "12345678-9 (con guión y dígito verificador)",
    "razon_social": "nombre completo",
    "giro": "actividad económica si aparece",
    "direccion": "si aparece"
  },
  "receptor": {
    "rut": "12345678-9",
    "razon_social": "nombre completo"
  },
  "items": [
    {"descripcion": "...", "cantidad": número, "precio_unitario": número en CLP sin formato, "total": número en CLP sin formato}
  ],
  "totales": {
    "neto": número en CLP,
    "iva": número en CLP,
    "total": número en CLP
  },
  "clasificacion_sugerida": {
    "cuenta": "Ej: Gastos generales, Servicios profesionales, Materias primas, Arriendo, Combustibles, Servicios básicos, Honorarios, etc.",
    "razon": "una oración explicando por qué esa clasificación basándote en el giro del emisor y los ítems"
  },
  "observaciones": "alertas relevantes si las hay. Si no hay, pon null."
}

Reglas estrictas:
- Solo responde con JSON válido, sin texto adicional, sin markdown, sin backticks.
- Los números van sin separadores de miles ni símbolo de moneda.
- Si un campo no se puede determinar, usa null (no inventes datos).
- El RUT debe tener formato XXXXXXXX-Y con guión.`;

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
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [sourceBlock, { type: 'text', text: PROMPT_FACTURA }],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('La API no devolvió texto');

  const cleaned = textBlock.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const err = new Error('No se pudo parsear la respuesta de la IA');
    err.status = 502;
    err.publicMessage = 'La extracción devolvió un formato inesperado. Intentá de nuevo.';
    throw err;
  }

  if (parsed.error) {
    const err = new Error(parsed.error);
    err.status = 422;
    err.publicMessage = parsed.error;
    throw err;
  }

  return parsed;
}
