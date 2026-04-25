# Procesador de Facturas — Gonfixit

Demo full-stack para contadoras chilenas. Procesa facturas con IA, concilia con cartolas bancarias y muestra dashboard ejecutivo.

## Estructura

Express en la raíz (sirve la API y el SPA buildeado en `public/`); el código fuente del frontend vive en `frontend/` solo para desarrollo y build.

```
.
├── server.js              ← Express startup file
├── package.json           ← deps del backend + scripts orquestadores
├── src/                   ← código del backend
├── public/                ← frontend buildeado (servido por Express)
└── frontend/              ← código fuente del SPA (Vite + React)
```

## Desarrollo local

```bash
# 1. Instalar dependencias
npm run install:all

# 2. Configurar API key
cp .env.example .env
# Editar .env y pegar ANTHROPIC_API_KEY

# 3. Arrancar (backend + Vite dev server con proxy)
npm run dev
```

- Backend: http://localhost:3000
- Frontend dev: http://localhost:5173 (con proxy a `/api` y `/health`)

## Build y producción

```bash
npm run build   # Builda el frontend de frontend/dist a public/
npm start       # node server.js — Express sirve API y SPA buildeado
```

En modo `start`, todo va por http://localhost:3000.

## Deploy a Hostinger hPanel (Node.js gestionado)

1. En hPanel → **Avanzado → Node.js**: crear app con startup file `server.js`, modo `production`.
2. En hPanel → **Avanzado → Git**: clonar `https://github.com/axcm2002/contabilidad.git` (branch `main`) en el mismo Application root.
3. Configurar variables de entorno: `ANTHROPIC_API_KEY`, `NODE_ENV=production`. NO setear `PORT` (Passenger lo inyecta).
4. Click en **Run NPM Install**.
5. Click en **Iniciar aplicación**.

Para futuros deploys: Git → Pull, después Node.js → Restart.

## Hostinger VPS

```bash
git clone https://github.com/axcm2002/contabilidad.git gonfixit
cd gonfixit
npm install
# Crear .env con la API key
pm2 start server.js --name gonfixit
pm2 save
```

(Si querés rebuildear el frontend en el VPS: `npm run install:frontend && npm run build`.)

## Costos esperados (Anthropic API)

- ~USD 0.005–0.015 por factura procesada (modelo `claude-sonnet-4-6` con visión).
- Se puede bajar a haiku editando `src/services/anthropic.js` (cambiar a `claude-haiku-4-5-20251001`) → ~USD 0.001–0.003 por factura.

## Activar pagos (Stripe — futuro)

Scaffolding listo en `src/services/stripe.js` y `src/routes/stripe.js`. Para activar:
1. `npm install stripe`
2. Pegar claves en `.env`: `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET`.
3. Descomentar el `app.use('/webhooks/stripe', ...)` en `server.js`.

## Próximos pasos (después del piloto)

- Migrar localStorage → Airtable o Supabase para persistencia compartida.
- Auth (login para contadoras).
- Multi-tenant.
- Sincronización con Nubox / Defontana vía API.
- Notificaciones por WhatsApp Business.
