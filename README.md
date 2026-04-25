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
