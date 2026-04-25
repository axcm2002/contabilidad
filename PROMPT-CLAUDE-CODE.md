# Procesador de Facturas — Master Prompt para Claude Code

> **Cómo usar este archivo (instrucciones para Felipe, no para Claude Code):**
>
> 1. Abrí una terminal (CMD en Windows / Terminal en Mac).
> 2. Creá una carpeta vacía y entrá: `mkdir procesador-facturas && cd procesador-facturas`
> 3. Iniciá Claude Code: `claude`
> 4. Cuando esté listo, copiá TODO lo que está debajo de la línea `--- INICIO PROMPT ---` (hasta el final del archivo) y pegalo en el chat de Claude Code.
> 5. Claude Code va a crear todos los archivos, instalar dependencias, probar local y dejarte listo para hacer git push.
> 6. Para tener la API key de Anthropic a mano antes de empezar, andá a https://console.anthropic.com → API Keys → Create Key.

---

--- INICIO PROMPT ---

# Tarea: Crear proyecto "procesador-facturas" full-stack

Sos Claude Code y vas a crear un proyecto Node.js + Express (backend) + React + Vite (frontend) que se sirve como un único servidor Express en producción.

**Contexto del proyecto:** demo para contadoras chilenas. 3 módulos en tabs sticky superiores:
1. **Procesador de facturas** — sube PDF/imagen, llama a la API de Anthropic, extrae proveedor/RUT/fecha/montos/categoría, guarda en localStorage.
2. **Conciliación bancaria** — sube cartola bancaria en Excel/CSV, cruza con facturas del historial por monto y fecha (±5 días).
3. **Dashboard ejecutivo** — gráficos de evolución mensual, gastos por categoría, top proveedores y alertas inteligentes.

Los 3 módulos comparten el mismo historial vía `localStorage` (clave `procesador-facturas-historial`). El backend solo expone endpoints; toda la persistencia es del lado del cliente para esta versión piloto.

**Stack:**
- Backend: Node.js + Express + helmet + cors + multer + Anthropic SDK + zod + pino
- Frontend: React 18 + Vite + Tailwind + Recharts + xlsx (SheetJS) + lucide-react
- Modelo Anthropic: `claude-sonnet-4-6` (con visión nativa para PDFs e imágenes)
- En producción, el backend Express sirve los archivos `dist/` del frontend.

**Pasos a ejecutar (en orden):**

1. Crear toda la estructura de archivos abajo descrita.
2. Correr `npm install` en `backend/` y `frontend/`.
3. Crear `backend/.env` copiando `.env.example` y dejarlo listo para que Felipe pegue su `ANTHROPIC_API_KEY`.
4. Hacer `npm run build` en `frontend/`.
5. Arrancar el backend en modo dev y verificar que `GET /health` responde `200`.
6. `git init`, primer commit. (No hacer `git push` automáticamente — preguntar a Felipe el repo remoto antes.)
7. Reportar al final: URL local funcionando + checklist de qué falta para deployar a Hostinger.

---

## Estructura de archivos

```
procesador-facturas/
├── .gitignore
├── README.md
├── package.json                 (root, scripts orquestadores)
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   └── src/
│       ├── routes/
│       │   ├── facturas.js
│       │   ├── conciliacion.js
│       │   └── stripe.js
│       ├── services/
│       │   ├── anthropic.js
│       │   └── stripe.js
│       ├── middleware/
│       │   └── error.js
│       └── utils/
│           └── logger.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── lib/
        │   ├── api.js
        │   ├── storage.js
        │   └── format.js
        └── components/
            ├── Procesador.jsx
            ├── Conciliacion.jsx
            └── Dashboard.jsx
```

---

## Archivos — contenido completo

### `.gitignore`

```
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
.vscode/
.idea/
```

### `README.md`

````markdown
# Procesador de Facturas

Demo full-stack para contadoras chilenas. Procesa facturas con IA, concilia con cartolas bancarias y muestra dashboard ejecutivo.

## Desarrollo local

```bash
# 1. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 2. Configurar API key
cd ../backend
cp .env.example .env
# Editar .env y pegar ANTHROPIC_API_KEY

# 3. Arrancar
cd ..
npm run dev
```

Backend: http://localhost:3000
Frontend (dev): http://localhost:5173 (con proxy automático al backend)

## Build y producción

```bash
npm run build   # Builda el frontend a backend/public
npm start       # Arranca solo el backend, que sirve el frontend buildeado
```

## Deploy a Hostinger

### Hostinger Node.js gestionado (panel hPanel)

1. En hPanel → Hosting → Avanzado → Setup Node.js App.
2. Application root: la carpeta donde subas el repo.
3. Application URL: tu dominio o subdominio.
4. Startup file: `backend/server.js`.
5. Variables de entorno: pegar `ANTHROPIC_API_KEY`, `NODE_ENV=production`, `PORT` (el que te dé Hostinger).
6. Click en "Run NPM install" desde el panel.
7. Click en "Run Script" → seleccionar `build` (definido en `package.json` raíz).
8. Click en "Start App".

### Hostinger VPS

```bash
# En el servidor
git clone TU_REPO procesador-facturas
cd procesador-facturas
npm run install:all
npm run build
# Crear backend/.env con la API key
pm2 start backend/server.js --name procesador-facturas
pm2 save
```

## Costos esperados (Anthropic API)

- ~USD 0.005–0.015 por factura procesada (modelo sonnet con visión).
- Se puede bajar a haiku editando `backend/src/services/anthropic.js` (cambiar `claude-sonnet-4-6` por `claude-haiku-4-5-20251001`) → ~USD 0.001–0.003 por factura.

## Activar pagos (Stripe — futuro)

Scaffolding listo. Para activar:
1. Pegar claves en `.env`: `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET`.
2. Descomentar el `app.use('/webhooks/stripe', ...)` en `backend/server.js`.
3. Agregar la UI de checkout en el frontend.

## Próximos pasos (después del piloto)

- Migrar localStorage → Airtable o Supabase para persistencia compartida.
- Auth (login para contadoras).
- Multi-tenant (cada contadora ve solo sus clientes).
- Sincronización con Nubox / Defontana vía API.
- Notificaciones por WhatsApp Business.
````

### `package.json` (raíz)

```json
{
  "name": "procesador-facturas",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "install:all": "cd backend && npm install && cd ../frontend && npm install",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "dev": "concurrently -n backend,frontend -c blue,green \"npm:dev:backend\" \"npm:dev:frontend\"",
    "build": "cd frontend && npm run build && cd .. && rm -rf backend/public && cp -r frontend/dist backend/public",
    "start": "cd backend && npm start"
  },
  "devDependencies": {
    "concurrently": "^9.0.1"
  }
}
```

---

## Backend

### `backend/package.json`

```json
{
  "name": "procesador-facturas-backend",
  "version": "0.1.0",
  "private": true,
  "main": "server.js",
  "scripts": {
    "dev": "node --watch server.js",
    "start": "node server.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.0",
    "helmet": "^8.0.0",
    "multer": "^1.4.5-lts.1",
    "pino": "^9.4.0",
    "pino-pretty": "^11.2.2",
    "zod": "^3.23.8"
  }
}
```

### `backend/.env.example`

```
# Anthropic
ANTHROPIC_API_KEY=

# Server
PORT=3000
NODE_ENV=development

# Stripe (scaffolding — activar cuando se decidan los pagos)
STRIPE_SECRET_KEY=
STRIPE_PUBLIC_KEY=
STRIPE_WEBHOOK_SECRET=
```

### `backend/server.js`

```js
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
```

### `backend/src/utils/logger.js`

```js
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
```

### `backend/src/middleware/error.js`

```js
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error({ err, path: req.path }, 'Request error');
  const status = err.status || 500;
  res.status(status).json({
    error: err.publicMessage || 'Error interno del servidor',
  });
}
```

### `backend/src/services/anthropic.js`

```js
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
```

### `backend/src/services/stripe.js`

```js
// Stripe scaffolding — listo para activar cuando se decidan los pagos.
// Para activar:
// 1. npm install stripe en backend/
// 2. Pegar claves en .env (STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY, STRIPE_WEBHOOK_SECRET)
// 3. Descomentar el import y las funciones, y la ruta en server.js

// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export async function createCheckoutSession({ items, customerId, successUrl, cancelUrl }) {
//   return stripe.checkout.sessions.create({
//     mode: 'payment',
//     line_items: items,
//     customer: customerId,
//     success_url: successUrl,
//     cancel_url: cancelUrl,
//   });
// }

// export async function createPaymentIntent({ amount, currency = 'clp', metadata = {} }) {
//   return stripe.paymentIntents.create({ amount, currency, metadata });
// }

// export async function retrievePaymentIntent(id) {
//   return stripe.paymentIntents.retrieve(id);
// }

// export function handleWebhookEvent(event) {
//   switch (event.type) {
//     case 'payment_intent.succeeded':
//     case 'checkout.session.completed':
//     case 'charge.refunded':
//       // TODO: actualizar registro en `orders`
//       return;
//     default:
//       return;
//   }
// }

export const STRIPE_PLACEHOLDER = true;
```

### `backend/src/routes/facturas.js`

```js
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
```

### `backend/src/routes/conciliacion.js`

```js
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
```

### `backend/src/routes/stripe.js`

```js
// Endpoint webhook de Stripe — scaffolding. Activar siguiendo README.
import { Router } from 'express';
import express from 'express';

const router = Router();

// Stripe necesita raw body para verificar la firma
router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  // const sig = req.headers['stripe-signature'];
  // const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  // handleWebhookEvent(event);
  res.json({ received: true, placeholder: true });
});

export default router;
```

---

## Frontend

### `frontend/package.json`

```json
{
  "name": "procesador-facturas-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.460.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.13.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "vite": "^5.4.10"
  }
}
```

### `frontend/vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

### `frontend/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

### `frontend/postcss.config.js`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### `frontend/index.html`

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Procesador de Facturas</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### `frontend/src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### `frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: #fafaf9;
  color: #1c1917;
}

* {
  -webkit-font-smoothing: antialiased;
}
```

### `frontend/src/lib/storage.js`

```js
const KEY = 'procesador-facturas-historial';

export function getHistorial() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistorial(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addFactura(factura) {
  const items = getHistorial();
  const conId = {
    ...factura,
    id: crypto.randomUUID(),
    procesada_en: new Date().toISOString(),
  };
  items.unshift(conId);
  saveHistorial(items);
  return conId;
}

export function removeFactura(id) {
  saveHistorial(getHistorial().filter((f) => f.id !== id));
}

export function clearHistorial() {
  localStorage.removeItem(KEY);
}
```

### `frontend/src/lib/api.js`

```js
export async function procesarFactura(file) {
  const fd = new FormData();
  fd.append('archivo', file);
  const res = await fetch('/api/facturas/procesar', { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error procesando factura');
  }
  return res.json();
}

export async function cruzarConciliacion(movimientos, facturas, toleranciaDias = 5) {
  const res = await fetch('/api/conciliacion/cruzar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movimientos, facturas, toleranciaDias }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error cruzando datos');
  }
  return res.json();
}
```

### `frontend/src/lib/format.js`

```js
export function formatCLP(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function mesLabel(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
}
```

### `frontend/src/App.jsx`

```jsx
import { useState } from 'react';
import { FileText, Banknote, BarChart3 } from 'lucide-react';
import Procesador from './components/Procesador.jsx';
import Conciliacion from './components/Conciliacion.jsx';
import Dashboard from './components/Dashboard.jsx';

const TABS = [
  { id: 'procesador', label: 'Procesador', icon: FileText },
  { id: 'conciliacion', label: 'Conciliación', icon: Banknote },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
];

export default function App() {
  const [tab, setTab] = useState('procesador');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-stone-900 grid place-items-center text-white font-bold">
              F
            </div>
            <div className="text-sm font-semibold text-stone-900">
              Procesador de Facturas
            </div>
          </div>
          <nav className="flex gap-1 bg-stone-100 p-1 rounded-lg">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition ${
                  tab === id
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'procesador' && <Procesador />}
        {tab === 'conciliacion' && <Conciliacion />}
        {tab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  );
}
```

### `frontend/src/components/Procesador.jsx`

```jsx
import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, Trash2, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { procesarFactura } from '../lib/api.js';
import { addFactura, getHistorial, removeFactura, clearHistorial } from '../lib/storage.js';
import { formatCLP, formatFecha } from '../lib/format.js';
import * as XLSX from 'xlsx';

export default function Procesador() {
  const [historial, setHistorial] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const [ultima, setUltima] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setHistorial(getHistorial());
  }, []);

  async function handleFile(file) {
    setError(null);
    setUltima(null);
    setProcesando(true);
    try {
      const { datos } = await procesarFactura(file);
      const guardada = addFactura(datos);
      setHistorial(getHistorial());
      setUltima(guardada);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleMultiple(files) {
    for (const f of files) {
      // procesar en serie para no saturar la API
      // eslint-disable-next-line no-await-in-loop
      await handleFile(f);
    }
  }

  function exportarExcel() {
    if (!historial.length) return;
    const rows = historial.map((f) => ({
      Proveedor: f.proveedor,
      RUT: f.rut_proveedor,
      'N° Factura': f.numero_factura,
      'Fecha emisión': f.fecha_emision,
      Categoría: f.categoria,
      Neto: f.monto_neto,
      IVA: f.iva,
      Total: f.monto_total,
      'Procesada en': f.procesada_en,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, `facturas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function eliminar(id) {
    removeFactura(id);
    setHistorial(getHistorial());
  }

  function limpiar() {
    if (!confirm('¿Eliminar todo el historial?')) return;
    clearHistorial();
    setHistorial([]);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-dashed border-stone-300 bg-white p-8 text-center">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="hidden"
          onChange={(e) => handleMultiple(Array.from(e.target.files || []))}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 grid place-items-center">
            <Upload className="text-stone-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Subir factura</h2>
            <p className="text-sm text-stone-500">
              Acepta PDF, JPG, PNG o WebP (hasta 10 MB). Podés subir varias a la vez.
            </p>
          </div>
          <button
            disabled={procesando}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
          >
            {procesando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Procesando…
              </>
            ) : (
              <>
                <Upload size={16} />
                Seleccionar archivos
              </>
            )}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm text-red-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {ultima && !procesando && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>
            Factura procesada: <strong>{ultima.proveedor}</strong> · {formatCLP(ultima.monto_total)}
          </span>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-stone-200">
        <header className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Historial</h3>
            <p className="text-xs text-stone-500">{historial.length} factura(s) procesada(s)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarExcel}
              disabled={!historial.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50"
            >
              <Download size={14} />
              Excel
            </button>
            <button
              onClick={limpiar}
              disabled={!historial.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Limpiar
            </button>
          </div>
        </header>

        {historial.length === 0 ? (
          <div className="p-10 text-center text-sm text-stone-500">
            Aún no hay facturas. Subí una arriba para empezar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Proveedor</th>
                  <th className="text-left px-4 py-2 font-medium">N°</th>
                  <th className="text-left px-4 py-2 font-medium">Fecha</th>
                  <th className="text-left px-4 py-2 font-medium">Categoría</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {historial.map((f) => (
                  <tr key={f.id} className="border-t border-stone-100">
                    <td className="px-4 py-2">
                      <div className="font-medium text-stone-900">{f.proveedor || '—'}</div>
                      <div className="text-xs text-stone-500">{f.rut_proveedor || ''}</div>
                    </td>
                    <td className="px-4 py-2 text-stone-700">{f.numero_factura || '—'}</td>
                    <td className="px-4 py-2 text-stone-700">{formatFecha(f.fecha_emision)}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-stone-100 text-stone-700">
                        {f.categoria || 'Otros'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-stone-900">
                      {formatCLP(f.monto_total)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => eliminar(f.id)}
                        className="text-stone-400 hover:text-red-600"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
```

### `frontend/src/components/Conciliacion.jsx`

```jsx
import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cruzarConciliacion } from '../lib/api.js';
import { getHistorial } from '../lib/storage.js';
import { formatCLP, formatFecha } from '../lib/format.js';

function detectarColumnas(headers) {
  const norm = headers.map((h) => String(h || '').toLowerCase().trim());
  const findOne = (...needles) =>
    norm.findIndex((h) => needles.some((n) => h.includes(n)));
  return {
    fecha: findOne('fecha'),
    descripcion: findOne('descrip', 'detalle', 'glosa', 'concepto'),
    cargo: findOne('cargo', 'débito', 'debito'),
    abono: findOne('abono', 'crédito', 'credito'),
    monto: findOne('monto', 'importe'),
  };
}

function parseFecha(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Excel serial
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  // dd/mm/yyyy o dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  // Ya en YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function parseMonto(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  return Number(String(v).replace(/[^\d.-]/g, '')) || 0;
}

export default function Conciliacion() {
  const [movimientos, setMovimientos] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [tolerancia, setTolerancia] = useState(5);
  const inputRef = useRef(null);

  async function handleFile(file) {
    setError(null);
    setResultado(null);
    setCargando(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      // buscar la fila de encabezados (la primera que tenga "fecha")
      let headerIdx = rows.findIndex((r) =>
        r.some((c) => String(c || '').toLowerCase().includes('fecha'))
      );
      if (headerIdx === -1) headerIdx = 0;

      const headers = rows[headerIdx];
      const cols = detectarColumnas(headers);
      const dataRows = rows.slice(headerIdx + 1);

      const movs = dataRows
        .map((r) => {
          const fecha = parseFecha(r[cols.fecha]);
          const cargo = cols.cargo >= 0 ? parseMonto(r[cols.cargo]) : 0;
          const abono = cols.abono >= 0 ? parseMonto(r[cols.abono]) : 0;
          const montoCol = cols.monto >= 0 ? parseMonto(r[cols.monto]) : 0;
          const monto = cargo > 0 ? -cargo : abono > 0 ? abono : montoCol;
          return {
            fecha,
            descripcion: cols.descripcion >= 0 ? String(r[cols.descripcion] ?? '') : '',
            monto,
          };
        })
        .filter((m) => m.fecha && m.monto !== 0);

      if (!movs.length) {
        throw new Error('No se detectaron movimientos. Revisá el formato de la cartola.');
      }
      setMovimientos(movs);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function cruzar() {
    setError(null);
    setCargando(true);
    try {
      const facturas = getHistorial();
      if (!facturas.length) {
        throw new Error('No hay facturas en el historial. Procesá facturas primero.');
      }
      const r = await cruzarConciliacion(movimientos, facturas, tolerancia);
      setResultado(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Conciliación bancaria</h2>
            <p className="text-sm text-stone-500">
              Subí tu cartola en Excel/CSV y cruzala con el historial de facturas.
            </p>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-stone-300 hover:bg-stone-50"
          >
            <Upload size={14} />
            Subir cartola
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        <div className="flex items-center gap-4 text-sm">
          <FileSpreadsheet size={16} className="text-stone-400" />
          <span className="text-stone-700">
            {movimientos.length
              ? `${movimientos.length} movimiento(s) cargado(s)`
              : 'Sin cartola cargada'}
          </span>

          <label className="ml-auto flex items-center gap-2 text-stone-600">
            Tolerancia:
            <select
              value={tolerancia}
              onChange={(e) => setTolerancia(Number(e.target.value))}
              className="border border-stone-300 rounded px-2 py-1 text-sm"
            >
              <option value={0}>Mismo día</option>
              <option value={3}>±3 días</option>
              <option value={5}>±5 días</option>
              <option value={10}>±10 días</option>
              <option value={30}>±30 días</option>
            </select>
          </label>

          <button
            onClick={cruzar}
            disabled={!movimientos.length || cargando}
            className="px-4 py-1.5 rounded-md bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
          >
            {cargando ? <Loader2 size={14} className="animate-spin" /> : 'Cruzar'}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm text-red-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resultado && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card label="Matches" value={resultado.resumen.matches} tone="emerald" />
          <Card
            label="Movimientos sin factura"
            value={resultado.resumen.movimientosSinMatch}
            tone="amber"
          />
          <Card
            label="Facturas sin movimiento"
            value={resultado.resumen.facturasSinMatch}
            tone="rose"
          />
        </div>
      )}

      {resultado && resultado.matches.length > 0 && (
        <Tabla
          titulo="Conciliados"
          icono={<CheckCircle2 size={14} className="text-emerald-600" />}
          rows={resultado.matches.map((m) => ({
            izq: `${formatFecha(m.movimiento.fecha)} · ${m.movimiento.descripcion}`,
            der: `${m.factura.proveedor} · ${formatFecha(m.factura.fecha_emision)}`,
            monto: m.movimiento.monto,
            extra: `Δ ${m.diferenciaDias} d`,
          }))}
        />
      )}

      {resultado && resultado.movimientosSinMatch.length > 0 && (
        <Tabla
          titulo="Movimientos sin factura asociada"
          icono={<AlertCircle size={14} className="text-amber-600" />}
          rows={resultado.movimientosSinMatch.map((m) => ({
            izq: `${formatFecha(m.fecha)} · ${m.descripcion}`,
            der: '—',
            monto: m.monto,
          }))}
        />
      )}

      {resultado && resultado.facturasSinMatch.length > 0 && (
        <Tabla
          titulo="Facturas sin movimiento bancario"
          icono={<AlertCircle size={14} className="text-rose-600" />}
          rows={resultado.facturasSinMatch.map((f) => ({
            izq: `${formatFecha(f.fecha_emision)} · ${f.proveedor}`,
            der: '—',
            monto: f.monto_total,
          }))}
        />
      )}
    </div>
  );
}

function Card({ label, value, tone }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    rose: 'bg-rose-50 text-rose-900 border-rose-200',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Tabla({ titulo, icono, rows }) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200">
      <header className="px-5 py-3 border-b border-stone-200 flex items-center gap-2">
        {icono}
        <h3 className="text-sm font-semibold text-stone-900">
          {titulo} <span className="text-stone-500 font-normal">({rows.length})</span>
        </h3>
      </header>
      <div className="divide-y divide-stone-100">
        {rows.map((r, i) => (
          <div key={i} className="px-5 py-2.5 flex items-center gap-4 text-sm">
            <div className="flex-1 text-stone-800 truncate">{r.izq}</div>
            <div className="flex-1 text-stone-600 truncate">{r.der}</div>
            <div className="font-medium text-stone-900 w-32 text-right">
              {formatCLP(r.monto)}
            </div>
            {r.extra && <div className="text-xs text-stone-500 w-12 text-right">{r.extra}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
```

### `frontend/src/components/Dashboard.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, AlertTriangle, Trophy } from 'lucide-react';
import { getHistorial } from '../lib/storage.js';
import { formatCLP, mesLabel } from '../lib/format.js';

const COLORS = ['#0f172a', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    setHistorial(getHistorial());
  }, []);

  const stats = useMemo(() => {
    if (!historial.length) return null;

    const total = historial.reduce((s, f) => s + (f.monto_total || 0), 0);
    const promedio = total / historial.length;

    // por mes
    const porMes = {};
    historial.forEach((f) => {
      if (!f.fecha_emision) return;
      const k = f.fecha_emision.slice(0, 7);
      porMes[k] = (porMes[k] || 0) + (f.monto_total || 0);
    });
    const evolucion = Object.entries(porMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ mes: mesLabel(`${k}-01`), monto: v }));

    // por categoría
    const porCat = {};
    historial.forEach((f) => {
      const c = f.categoria || 'Otros';
      porCat[c] = (porCat[c] || 0) + (f.monto_total || 0);
    });
    const categorias = Object.entries(porCat).map(([name, value]) => ({ name, value }));

    // top proveedores
    const porProv = {};
    historial.forEach((f) => {
      const p = f.proveedor || 'Desconocido';
      porProv[p] = (porProv[p] || 0) + (f.monto_total || 0);
    });
    const top = Object.entries(porProv)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value, pct: (value / total) * 100 }));

    // alertas
    const alertas = [];
    const altos = historial.filter((f) => f.monto_total > promedio * 3);
    if (altos.length) {
      alertas.push({
        tipo: 'monto',
        msg: `${altos.length} factura(s) con monto significativamente sobre el promedio (>3×).`,
      });
    }
    if (top[0] && top[0].pct > 40) {
      alertas.push({
        tipo: 'concentracion',
        msg: `Alta concentración en ${top[0].name} (${top[0].pct.toFixed(0)}% del gasto total).`,
      });
    }

    return { total, promedio, evolucion, categorias, top, alertas, count: historial.length };
  }, [historial]);

  if (!stats) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center text-sm text-stone-500">
        Procesá facturas para ver el dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Total facturado" value={formatCLP(stats.total)} />
        <Stat label="Facturas" value={stats.count} />
        <Stat label="Promedio" value={formatCLP(stats.promedio)} />
      </div>

      {stats.alertas.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-700" />
            <h3 className="text-sm font-semibold text-amber-900">Alertas</h3>
          </div>
          <ul className="space-y-1 text-sm text-amber-900">
            {stats.alertas.map((a, i) => (
              <li key={i}>• {a.msg}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-stone-200 p-5">
        <header className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-stone-700" />
          <h3 className="text-sm font-semibold text-stone-900">Evolución mensual</h3>
        </header>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={stats.evolucion}>
              <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickFormatter={(v) => new Intl.NumberFormat('es-CL', { notation: 'compact' }).format(v)}
              />
              <Tooltip formatter={(v) => formatCLP(v)} />
              <Bar dataKey="monto" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-4">Gastos por categoría</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={stats.categorias}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {stats.categorias.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCLP(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 p-5">
          <header className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-stone-700" />
            <h3 className="text-sm font-semibold text-stone-900">Top 5 proveedores</h3>
          </header>
          <div className="space-y-3">
            {stats.top.map((p, i) => (
              <div key={p.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-stone-800 truncate pr-2">
                    {i + 1}. {p.name}
                  </span>
                  <span className="text-stone-600 font-medium">{formatCLP(p.value)}</span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-900"
                    style={{ width: `${Math.min(100, p.pct)}%` }}
                  />
                </div>
                <div className="text-xs text-stone-500 mt-0.5">{p.pct.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className="text-2xl font-bold text-stone-900 mt-1">{value}</div>
    </div>
  );
}
```

---

## Pasos de ejecución

Ejecutá en este orden:

```bash
# 1. Crear todos los archivos arriba descritos respetando la estructura.

# 2. Instalar deps
cd backend && npm install
cd ../frontend && npm install
cd ..
npm install   # instala concurrently en root

# 3. Configurar entorno
cp backend/.env.example backend/.env
# (Felipe deberá pegar manualmente ANTHROPIC_API_KEY antes de probar el procesador)

# 4. Build inicial del frontend (verifica que compila)
cd frontend && npm run build && cd ..

# 5. Probar backend
# En una terminal:
cd backend && npm run dev
# En otra terminal:
curl http://localhost:3000/health
# Debería responder { status: "ok", uptime: ... }

# 6. Probar dev mode completo (en root)
npm run dev
# Frontend: http://localhost:5173 con proxy al backend
```

## Git

Inicializar repo, primer commit, **pero no hacer push automático**. Preguntar a Felipe el repo remoto antes de pushear.

```bash
git init
git add .
git commit -m "Initial commit: procesador de facturas (backend + frontend)"
```

Después preguntar a Felipe:
- "¿Cuál es el repo remoto de GitHub? (formato: `git@github.com:usuario/repo.git` o `https://github.com/usuario/repo.git`)"
- Una vez que responda: `git remote add origin <URL>` y `git push -u origin main`.

## Reporte final

Al terminar, mostrar a Felipe:

1. ✅ / ❌ de cada paso (instalación, build, health check, git init).
2. URLs locales: backend `http://localhost:3000/health`, frontend dev `http://localhost:5173`.
3. Pendientes que dependen de Felipe:
   - Pegar `ANTHROPIC_API_KEY` en `backend/.env` (sin esto, el procesador devuelve 500).
   - Confirmar repo remoto para hacer push.
   - Confirmar tipo de Hostinger (gestionado o VPS) para indicarle pasos específicos del deploy.

--- FIN PROMPT ---
