# Rediseño Gonfixit — Prompt para Claude Code

> **Cómo usarlo (Felipe):** Mové este archivo a `C:\Users\axcm2\Documents\procesador-facturas\` (al lado del `PROMPT-CLAUDE-CODE.md` viejo). En Claude Code escribí simplemente:
>
> `ejecuta las instrucciones del archivo PROMPT-REDISEÑO-GONFIXIT.md`

---

# Tarea: Rediseño completo con estética Gonfixit

Vas a reemplazar **7 archivos existentes** del proyecto por las versiones de abajo. La funcionalidad se mantiene, lo que cambia es:

1. La identidad de marca: el producto se llama **Gonfixit**, wordmark `Gon` + `fix` (verde italic) + `it`.
2. Estética editorial premium: paleta crema cálida + verde profundo + tipografías Fraunces (display) + Geist (body) + Geist Mono.
3. El backend devuelve ahora un **schema rico** (RUT con DV, items, clasificación contable con razón, observaciones), no el simplificado anterior.
4. El Procesador valida RUT chileno con dígito verificador, muestra ítems detallados y la sugerencia contable destacada.
5. Conciliación y Dashboard rediseñados con la misma identidad — sin Recharts, gráficos en CSS custom.

**Ningún archivo se borra. No hay deps nuevas que instalar.** Solo `str_replace`/sobrescribir los 7 archivos listados.

Después de aplicar todo:
- Verificar que el frontend builds sin errores: `cd frontend && npm run build`.
- Si el servidor dev ya está corriendo, se recarga solo. Si no, arrancar con `npm run dev` desde la raíz.
- Confirmar a Felipe el resultado y avisar que puede probar en `http://localhost:5174/` (o el puerto que esté libre).

---

## Archivos a reemplazar (en orden)

### 1. `backend/src/services/anthropic.js` — schema rico

Reemplazar TODO el contenido por:

```js
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
```

### 2. `frontend/index.html` — title + fuentes

Reemplazar TODO el contenido por:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gonfixit — Procesador contable</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### 3. `frontend/src/index.css` — tokens de marca

Reemplazar TODO el contenido por:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #F5F0E5;
  --bg-card: #FCFAF5;
  --border: #C9BEA8;
  --border-soft: #E8DFCC;
  --green: #1F4938;
  --green-soft: #A8C9B5;
  --green-softer: #C5DCC8;
  --text: #1A1814;
  --text-2: #5A5042;
  --text-3: #7A6F5C;
  --warn: #A8631E;
  --warn-bg: #FBF3E5;
  --warn-text: #5A4220;
}

html,
body {
  font-family: 'Geist', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

.display {
  font-family: 'Fraunces', serif;
  font-feature-settings: 'ss01' on;
  letter-spacing: -0.02em;
}

.mono {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-feature-settings: 'zero' on;
}

.grid-bg {
  background-image:
    linear-gradient(rgba(42, 37, 32, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(42, 37, 32, 0.04) 1px, transparent 1px);
  background-size: 28px 28px;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 0.5s ease-out forwards; }
.delay-1 { animation-delay: 0.05s; opacity: 0; }
.delay-2 { animation-delay: 0.15s; opacity: 0; }
.delay-3 { animation-delay: 0.25s; opacity: 0; }
.delay-4 { animation-delay: 0.35s; opacity: 0; }
.delay-5 { animation-delay: 0.45s; opacity: 0; }

@keyframes pulseSoft {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
.pulse-soft { animation: pulseSoft 1.4s ease-in-out infinite; }

@keyframes scanY {
  0% { transform: translateY(0%); }
  100% { transform: translateY(800%); }
}
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #1F4938 40%, #1F4938 60%, transparent);
  animation: scanY 2s linear infinite;
  opacity: 0.7;
}

.row-hover:hover { background-color: #F5F0E5; }
```

### 4. `frontend/src/lib/storage.js` — usar la key del artifact

Reemplazar TODO el contenido por:

```js
const KEY = 'historial-facturas';

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

export function clearHistorial() {
  localStorage.removeItem(KEY);
}
```

### 5. `frontend/src/App.jsx` — header Gonfixit

Reemplazar TODO el contenido por:

```jsx
import { useState } from 'react';
import Procesador from './components/Procesador.jsx';
import Conciliacion from './components/Conciliacion.jsx';
import Dashboard from './components/Dashboard.jsx';

const TABS = [
  { id: 'procesador', label: 'Procesador' },
  { id: 'conciliacion', label: 'Conciliación' },
  { id: 'dashboard', label: 'Dashboard' },
];

export default function App() {
  const [tab, setTab] = useState('procesador');

  return (
    <div className="grid-bg min-h-screen">
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: 'rgba(245, 240, 229, 0.9)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="#" className="display text-2xl leading-none flex items-baseline" style={{ fontWeight: 600 }}>
            <span style={{ color: 'var(--text)' }}>Gon</span>
            <span style={{ color: 'var(--green)', fontStyle: 'italic', fontWeight: 500 }}>fix</span>
            <span style={{ color: 'var(--text)' }}>it</span>
          </a>
          <nav className="flex gap-1 p-1 rounded-full" style={{ background: 'rgba(201, 190, 168, 0.25)' }}>
            {TABS.map(({ id, label }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="px-4 py-1.5 text-xs uppercase tracking-wider rounded-full transition-all"
                  style={{
                    background: active ? 'var(--bg-card)' : 'transparent',
                    color: active ? 'var(--text)' : 'var(--text-3)',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {tab === 'procesador' && <Procesador />}
        {tab === 'conciliacion' && <Conciliacion />}
        {tab === 'dashboard' && <Dashboard />}
      </main>

      <footer
        className="max-w-5xl mx-auto px-6 mt-12 pt-8 pb-10 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-3)' }}
      >
        <div className="flex items-center gap-3">
          <span className="display text-base" style={{ fontWeight: 600 }}>
            <span style={{ color: 'var(--text-2)' }}>Gon</span>
            <span style={{ color: 'var(--green)', fontStyle: 'italic', fontWeight: 500 }}>fix</span>
            <span style={{ color: 'var(--text-2)' }}>it</span>
          </span>
          <span className="uppercase tracking-widest">Sistemas contables inteligentes</span>
        </div>
        <div className="mono">© 2026 GONFIXIT</div>
      </footer>
    </div>
  );
}
```

### 6. `frontend/src/components/Procesador.jsx`

Reemplazar TODO el contenido por:

```jsx
import { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2, RefreshCw,
  Sparkles, Search, Download, Trash2, Clock, Receipt, Wallet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getHistorial, saveHistorial, clearHistorial } from '../lib/storage.js';

function validarRUT(rut) {
  if (!rut) return false;
  const cleanRut = rut.replace(/[.\-\s]/g, '').toUpperCase();
  if (cleanRut.length < 2) return false;
  const dv = cleanRut.slice(-1);
  const num = cleanRut.slice(0, -1);
  if (!/^\d+$/.test(num)) return false;
  let sum = 0;
  let multiplier = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    sum += parseInt(num[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = sum % 11;
  const calculatedDv = 11 - remainder;
  let expectedDv;
  if (calculatedDv === 11) expectedDv = '0';
  else if (calculatedDv === 10) expectedDv = 'K';
  else expectedDv = calculatedDv.toString();
  return dv === expectedDv;
}

function formatCLP(num) {
  if (typeof num !== 'number' || isNaN(num)) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(num);
}

function formatCLPCompact(num) {
  if (typeof num !== 'number' || isNaN(num)) return '—';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num}`;
}

function formatRUT(rut) {
  if (!rut) return '—';
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase();
  if (clean.length < 2) return rut;
  const dv = clean.slice(-1);
  const num = clean.slice(0, -1);
  return `${num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return '—';
  try {
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  } catch { return fechaStr; }
}

function getCuenta(clasificacion) {
  if (!clasificacion) return '—';
  if (typeof clasificacion === 'string') return clasificacion;
  return clasificacion.cuenta || '—';
}

const PASOS = ['Leyendo factura', 'Extrayendo datos', 'Validando RUT', 'Clasificando contablemente'];
const MIN_AHORRADOS_POR_FACTURA = 2;

export default function Procesador() {
  const [estado, setEstado] = useState('idle');
  const [imagenPreview, setImagenPreview] = useState(null);
  const [datos, setDatos] = useState(null);
  const [tiempoProcesamiento, setTiempoProcesamiento] = useState(null);
  const [error, setError] = useState(null);
  const [pasoActual, setPasoActual] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [query, setQuery] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { setHistorial(getHistorial()); }, []);

  const guardarYActualizar = (nuevoHistorial) => {
    setHistorial(nuevoHistorial);
    saveHistorial(nuevoHistorial);
  };

  const agregarAlHistorial = (datosNuevos, tiempo) => {
    const nuevoItem = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      tiempoProcesamiento: tiempo,
      ...datosNuevos,
    };
    guardarYActualizar([nuevoItem, ...getHistorial()]);
  };

  const procesarArchivo = async (file) => {
    if (!file) return;
    const isImage = file.type.match(/^image\/(jpeg|jpg|png|webp|gif)$/i);
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      setError('Por ahora soportamos imágenes (JPG, PNG, WebP, GIF) o PDF.');
      setEstado('error');
      return;
    }
    setEstado('processing');
    setError(null);
    setPasoActual(0);
    const startTime = Date.now();

    const previewReader = new FileReader();
    previewReader.onload = (e) => setImagenPreview(e.target.result);
    previewReader.readAsDataURL(file);

    const pasoInterval = setInterval(() => {
      setPasoActual((p) => Math.min(p + 1, PASOS.length - 1));
    }, 1100);

    try {
      const fd = new FormData();
      fd.append('archivo', file);
      const response = await fetch('/api/facturas/procesar', { method: 'POST', body: fd });
      clearInterval(pasoInterval);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Error procesando factura');
      const parsedData = data.datos;
      if (parsedData.error) throw new Error(parsedData.error);

      const tiempoSegundos = ((Date.now() - startTime) / 1000).toFixed(1);
      setDatos(parsedData);
      setTiempoProcesamiento(tiempoSegundos);
      setPasoActual(PASOS.length - 1);
      setEstado('success');
      agregarAlHistorial(parsedData, tiempoSegundos);
    } catch (err) {
      clearInterval(pasoInterval);
      setError(err.message || 'No pudimos procesar el archivo');
      setEstado('error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    procesarArchivo(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e) => procesarArchivo(e.target.files[0]);

  const reset = () => {
    setEstado('idle');
    setImagenPreview(null);
    setDatos(null);
    setError(null);
    setPasoActual(0);
    setTiempoProcesamiento(null);
  };

  const limpiar = () => {
    if (!window.confirm('¿Borrar todas las facturas del historial? Esta acción no se puede deshacer.')) return;
    clearHistorial();
    setHistorial([]);
  };

  const exportarExcel = () => {
    if (historial.length === 0) return;
    const rows = historial.map((f) => ({
      'Tipo': f.tipo_documento || '',
      'Folio': f.folio || '',
      'Fecha': f.fecha || '',
      'RUT Emisor': f.emisor?.rut || '',
      'Razón Social Emisor': f.emisor?.razon_social || '',
      'Giro': f.emisor?.giro || '',
      'RUT Receptor': f.receptor?.rut || '',
      'Razón Social Receptor': f.receptor?.razon_social || '',
      'Neto': f.totales?.neto || 0,
      'IVA': f.totales?.iva || 0,
      'Total': f.totales?.total || 0,
      'Cuenta Sugerida': getCuenta(f.clasificacion_sugerida),
      'Observaciones': f.observaciones || '',
      'Procesado en (s)': f.tiempoProcesamiento || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 30 },
      { wch: 24 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 24 }, { wch: 30 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas procesadas');
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `facturas-procesadas-${fecha}.xlsx`);
  };

  const rutEmisorValido = datos?.emisor?.rut ? validarRUT(datos.emisor.rut) : null;
  const rutReceptorValido = datos?.receptor?.rut ? validarRUT(datos.receptor.rut) : null;

  const historialFiltrado = historial.filter((f) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      f.emisor?.razon_social?.toLowerCase().includes(q) ||
      f.emisor?.rut?.toLowerCase().includes(q) ||
      f.tipo_documento?.toLowerCase().includes(q) ||
      String(f.folio || '').toLowerCase().includes(q) ||
      getCuenta(f.clasificacion_sugerida).toLowerCase().includes(q)
    );
  });

  const totalFacturas = historial.length;
  const totalGastos = historial.reduce((s, f) => s + (f.totales?.total || 0), 0);
  const minutosAhorrados = totalFacturas * MIN_AHORRADOS_POR_FACTURA;
  const horasAhorradas = (minutosAhorrados / 60).toFixed(1);

  return (
    <>
      <header className="mb-10 fade-up">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
          <FileText size={12} />
          <span>Procesador</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>Facturas chilenas</span>
        </div>
        <h1 className="display text-4xl md:text-6xl leading-[0.95] mb-4" style={{ color: 'var(--text)' }}>
          De factura a contabilidad,<br />
          <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>en segundos.</em>
        </h1>
        <p className="text-base md:text-lg max-w-2xl" style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>
          Subí una factura chilena en cualquier formato — incluso una foto torcida con sombra — y mirá cómo se lee, valida y clasifica como lo haría un contador con experiencia.
        </p>
      </header>

      {estado === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="fade-up cursor-pointer rounded-2xl border-2 border-dashed transition-all p-12 md:p-16 text-center"
          style={{
            borderColor: dragOver ? 'var(--green)' : 'var(--border)',
            backgroundColor: dragOver ? 'var(--bg-card)' : 'transparent',
            transform: dragOver ? 'scale(1.005)' : 'none',
          }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'var(--green)', color: 'var(--bg)' }}>
            <Upload size={26} />
          </div>
          <h2 className="display text-2xl md:text-3xl mb-2" style={{ color: 'var(--text)' }}>Arrastrá una factura aquí</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>o hacé clic para seleccionar · JPG, PNG, PDF</p>
          <div className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} /> Lee fotos torcidas</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} /> Valida dígito verificador</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} /> Sugiere cuenta contable</span>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileInput} className="hidden" />
        </div>
      )}

      {estado === 'processing' && (
        <div className="fade-up rounded-2xl border p-8 md:p-12" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {imagenPreview && (
              <div className="relative w-44 h-60 overflow-hidden rounded-lg flex-shrink-0" style={{ background: 'var(--bg)', border: '1px solid var(--border-soft)' }}>
                <img src={imagenPreview} alt="Factura" className="w-full h-full object-contain" />
                <div className="scan-line"></div>
              </div>
            )}
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
                <Loader2 size={12} className="animate-spin" />
                <span>Procesando</span>
              </div>
              <h2 className="display text-2xl md:text-3xl mb-6" style={{ color: 'var(--text)' }}>
                {PASOS[pasoActual]}<span className="pulse-soft">…</span>
              </h2>
              <div className="space-y-2.5">
                {PASOS.map((paso, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm" style={{
                    color: i <= pasoActual ? 'var(--text)' : '#A89A82',
                    opacity: i <= pasoActual ? 1 : 0.5,
                    transition: 'all 0.3s ease',
                  }}>
                    {i < pasoActual ? (
                      <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
                    ) : i === pasoActual ? (
                      <Loader2 size={16} className="animate-spin" style={{ color: 'var(--green)' }} />
                    ) : (
                      <div className="w-4 h-4 rounded-full border" style={{ borderColor: 'var(--border)' }}></div>
                    )}
                    <span className="mono text-xs uppercase tracking-wider">{paso}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {estado === 'success' && datos && (
        <div className="space-y-5">
          <div className="fade-up delay-1 rounded-2xl border p-6 md:p-8 flex flex-col md:flex-row md:items-end gap-6 justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--green)' }}>
                <CheckCircle2 size={12} />
                <span>Procesado en {tiempoProcesamiento}s · Guardado en historial</span>
              </div>
              <h2 className="display text-3xl md:text-4xl leading-tight" style={{ color: 'var(--text)' }}>
                {datos.tipo_documento || 'Documento'}
              </h2>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span><span style={{ color: 'var(--text-3)' }}>Folio </span><span className="mono" style={{ color: 'var(--text)' }}>{datos.folio || '—'}</span></span>
                <span><span style={{ color: 'var(--text-3)' }}>Fecha </span><span className="mono" style={{ color: 'var(--text)' }}>{datos.fecha || '—'}</span></span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Total</div>
              <div className="display text-4xl md:text-5xl mono" style={{ color: 'var(--green)' }}>{formatCLP(datos.totales?.total)}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="fade-up delay-2 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Emisor</div>
                {rutEmisorValido !== null && (rutEmisorValido ? (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--green)' }}><CheckCircle2 size={12} /> RUT válido</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--warn)' }}><AlertCircle size={12} /> Verificar</span>
                ))}
              </div>
              <div className="display text-xl mb-2" style={{ color: 'var(--text)' }}>{datos.emisor?.razon_social || '—'}</div>
              <div className="mono text-sm mb-3" style={{ color: 'var(--text-2)' }}>{formatRUT(datos.emisor?.rut)}</div>
              {datos.emisor?.giro && (
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                  <span className="block text-xs uppercase tracking-widest mb-0.5">Giro</span>
                  <span style={{ color: 'var(--text-2)' }}>{datos.emisor.giro}</span>
                </div>
              )}
            </div>
            <div className="fade-up delay-3 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Receptor</div>
                {rutReceptorValido !== null && (rutReceptorValido ? (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--green)' }}><CheckCircle2 size={12} /> RUT válido</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--warn)' }}><AlertCircle size={12} /> Verificar</span>
                ))}
              </div>
              <div className="display text-xl mb-2" style={{ color: 'var(--text)' }}>{datos.receptor?.razon_social || '—'}</div>
              <div className="mono text-sm" style={{ color: 'var(--text-2)' }}>{formatRUT(datos.receptor?.rut)}</div>
            </div>
          </div>

          {datos.items?.length > 0 && (
            <div className="fade-up delay-4 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="px-6 pt-6 pb-3 text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                Detalle ({datos.items.length} {datos.items.length === 1 ? 'ítem' : 'ítems'})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: 'var(--text-3)' }}>
                      <th className="px-6 py-2 text-left text-xs uppercase tracking-wider font-normal">Descripción</th>
                      <th className="px-6 py-2 text-right text-xs uppercase tracking-wider font-normal">Cant.</th>
                      <th className="px-6 py-2 text-right text-xs uppercase tracking-wider font-normal">P. Unit.</th>
                      <th className="px-6 py-2 text-right text-xs uppercase tracking-wider font-normal">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.items.map((item, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border-soft)' }}>
                        <td className="px-6 py-3" style={{ color: 'var(--text)' }}>{item.descripcion || '—'}</td>
                        <td className="px-6 py-3 text-right mono" style={{ color: 'var(--text-2)' }}>{item.cantidad ?? '—'}</td>
                        <td className="px-6 py-3 text-right mono" style={{ color: 'var(--text-2)' }}>{formatCLP(item.precio_unitario)}</td>
                        <td className="px-6 py-3 text-right mono" style={{ color: 'var(--text)' }}>{formatCLP(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ borderTop: '1px solid var(--border)' }}>
                    <tr>
                      <td colSpan="3" className="px-6 py-2 text-right text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Neto</td>
                      <td className="px-6 py-2 text-right mono text-sm" style={{ color: 'var(--text)' }}>{formatCLP(datos.totales?.neto)}</td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-6 py-2 text-right text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>IVA</td>
                      <td className="px-6 py-2 text-right mono text-sm" style={{ color: 'var(--text)' }}>{formatCLP(datos.totales?.iva)}</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid var(--border)' }}>
                      <td colSpan="3" className="px-6 py-3 text-right text-xs uppercase tracking-wider" style={{ color: 'var(--text)' }}>Total</td>
                      <td className="px-6 py-3 text-right mono text-base" style={{ color: 'var(--green)', fontWeight: 500 }}>{formatCLP(datos.totales?.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {datos.clasificacion_sugerida && (
            <div className="fade-up delay-5 rounded-2xl p-6 md:p-8" style={{ background: 'var(--green)', color: 'var(--bg)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--green-soft)' }}>
                <Sparkles size={12} />
                <span>Sugerencia contable</span>
              </div>
              <h3 className="display text-2xl md:text-3xl mb-2">{getCuenta(datos.clasificacion_sugerida)}</h3>
              {typeof datos.clasificacion_sugerida === 'object' && datos.clasificacion_sugerida.razon && (
                <p className="text-sm" style={{ color: 'var(--green-softer)', lineHeight: 1.55 }}>{datos.clasificacion_sugerida.razon}</p>
              )}
            </div>
          )}

          {datos.observaciones && (
            <div className="fade-up rounded-xl border p-4 flex gap-3" style={{ borderColor: 'var(--warn)', background: 'var(--warn-bg)' }}>
              <AlertCircle size={18} style={{ color: 'var(--warn)' }} className="flex-shrink-0 mt-0.5" />
              <div className="text-sm" style={{ color: 'var(--warn-text)' }}>
                <div className="font-medium mb-0.5">Observaciones</div>
                <div>{datos.observaciones}</div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 text-sm uppercase tracking-wider px-5 py-2.5 rounded-full border transition-all"
              style={{ borderColor: 'var(--green)', color: 'var(--green)', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.color = 'var(--bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--green)'; }}
            >
              <RefreshCw size={14} />
              Procesar otra factura
            </button>
          </div>
        </div>
      )}

      {estado === 'error' && (
        <div className="fade-up rounded-2xl border p-8 md:p-12 text-center" style={{ borderColor: 'var(--warn)', background: 'var(--warn-bg)' }}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: 'var(--warn)', color: 'var(--warn-bg)' }}>
            <AlertCircle size={24} />
          </div>
          <h2 className="display text-2xl mb-2" style={{ color: 'var(--warn-text)' }}>No pudimos procesar</h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--warn-text)' }}>{error}</p>
          <button onClick={reset} className="inline-flex items-center gap-2 text-sm uppercase tracking-wider px-5 py-2.5 rounded-full" style={{ background: 'var(--warn-text)', color: 'var(--warn-bg)' }}>
            <RefreshCw size={14} />
            Intentar de nuevo
          </button>
        </div>
      )}

      {historial.length > 0 && (
        <div className="mt-16 fade-up">
          <div className="mb-8 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
              <Clock size={12} />
              <span>Historial</span>
            </div>
            <h2 className="display text-3xl md:text-4xl" style={{ color: 'var(--text)' }}>Todo queda registrado.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
                <Receipt size={12} />
                <span>Facturas procesadas</span>
              </div>
              <div className="display text-3xl mono" style={{ color: 'var(--text)' }}>{totalFacturas}</div>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
                <Wallet size={12} />
                <span>Total acumulado</span>
              </div>
              <div className="display text-3xl mono" style={{ color: 'var(--green)' }}>{formatCLP(totalGastos)}</div>
            </div>
            <div className="rounded-xl p-5" style={{ background: 'var(--green)', color: 'var(--bg)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--green-soft)' }}>
                <Clock size={12} />
                <span>Tiempo ahorrado</span>
              </div>
              <div className="display text-3xl mono">
                {minutosAhorrados < 60 ? `${minutosAhorrados} min` : `${horasAhorradas} hrs`}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--green-soft)' }}>vs digitación manual</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mb-5">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
              <input
                type="text"
                placeholder="Buscar por emisor, RUT, folio o cuenta…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-full border text-sm focus:outline-none transition-all"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--green)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportarExcel}
                className="inline-flex items-center gap-2 text-sm uppercase tracking-wider px-5 py-3 rounded-full transition-all"
                style={{ background: 'var(--green)', color: 'var(--bg)' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Download size={14} />
                Excel
              </button>
              <button
                onClick={limpiar}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full border transition-all"
                style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
                title="Limpiar historial"
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--warn)'; e.currentTarget.style.color = 'var(--warn)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {historialFiltrado.length === 0 ? (
            <div className="rounded-xl border p-8 text-center text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-3)' }}>
              No encontramos facturas que coincidan con "{query}"
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: 'var(--text-3)', background: 'var(--bg)' }}>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-normal">Tipo</th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-normal">Folio</th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-normal">Fecha</th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-normal">Emisor</th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-normal">Cuenta</th>
                      <th className="px-5 py-3 text-right text-xs uppercase tracking-wider font-normal">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialFiltrado.map((f) => (
                      <tr key={f.id} className="row-hover transition-colors" style={{ borderTop: '1px solid var(--border-soft)' }}>
                        <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{f.tipo_documento || '—'}</td>
                        <td className="px-5 py-3 mono text-xs" style={{ color: 'var(--text-2)' }}>{f.folio || '—'}</td>
                        <td className="px-5 py-3 mono text-xs" style={{ color: 'var(--text-2)' }}>{formatFechaCorta(f.fecha)}</td>
                        <td className="px-5 py-3" style={{ color: 'var(--text)' }}>
                          <div className="font-medium">{f.emisor?.razon_social || '—'}</div>
                          <div className="mono text-xs" style={{ color: 'var(--text-3)' }}>{formatRUT(f.emisor?.rut)}</div>
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{getCuenta(f.clasificacion_sugerida)}</td>
                        <td className="px-5 py-3 text-right mono" style={{ color: 'var(--green)', fontWeight: 500 }}>{formatCLPCompact(f.totales?.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-3 text-xs" style={{ color: 'var(--text-3)' }}>
            Estimación de ahorro: 2 minutos por factura vs digitación manual
          </div>
        </div>
      )}
    </>
  );
}
```

### 7. `frontend/src/components/Conciliacion.jsx`

Reemplazar TODO el contenido por:

```jsx
import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Receipt } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cruzarConciliacion } from '../lib/api.js';
import { getHistorial } from '../lib/storage.js';

function formatCLP(num) {
  if (typeof num !== 'number' || isNaN(num)) return '—';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(num);
}

function formatFechaCorta(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  } catch { return iso; }
}

function detectarColumnas(headers) {
  const norm = headers.map((h) => String(h || '').toLowerCase().trim());
  const findOne = (...needles) => norm.findIndex((h) => needles.some((n) => h.includes(n)));
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
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function parseMonto(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  return Number(String(v).replace(/[^\d.-]/g, '')) || 0;
}

// Adapta facturas del historial al formato {id, monto_total, fecha_emision} esperado por el backend
function facturasParaCruce() {
  return getHistorial().map((f) => ({
    id: String(f.id),
    proveedor: f.emisor?.razon_social || 'Sin emisor',
    fecha_emision: f.fecha || null,
    monto_total: f.totales?.total || null,
  }));
}

export default function Conciliacion() {
  const [movimientos, setMovimientos] = useState([]);
  const [archivoNombre, setArchivoNombre] = useState(null);
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

      let headerIdx = rows.findIndex((r) =>
        r.some((c) => String(c || '').toLowerCase().includes('fecha'))
      );
      if (headerIdx === -1) headerIdx = 0;

      const headers = rows[headerIdx];
      const cols = detectarColumnas(headers);
      const dataRows = rows.slice(headerIdx + 1);

      const movs = dataRows.map((r) => {
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
      }).filter((m) => m.fecha && m.monto !== 0);

      if (!movs.length) throw new Error('No se detectaron movimientos. Revisá el formato de la cartola.');
      setMovimientos(movs);
      setArchivoNombre(file.name);
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
      const facturas = facturasParaCruce();
      if (!facturas.length) throw new Error('No hay facturas en el historial. Procesá facturas primero en la pestaña Procesador.');
      const r = await cruzarConciliacion(movimientos, facturas, tolerancia);
      setResultado(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <header className="mb-10 fade-up">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
          <FileSpreadsheet size={12} />
          <span>Conciliación bancaria</span>
        </div>
        <h1 className="display text-4xl md:text-6xl leading-[0.95] mb-4" style={{ color: 'var(--text)' }}>
          Cartola contra facturas,<br />
          <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>sin Excel manual.</em>
        </h1>
        <p className="text-base md:text-lg max-w-2xl" style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>
          Subí la cartola del banco y cruzala con las facturas del historial. Te marcamos qué cuadra, qué falta y qué sobra.
        </p>
      </header>

      <div className="fade-up delay-1 rounded-2xl border p-6 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => inputRef.current?.click()}
              className="w-11 h-11 rounded-full grid place-items-center"
              style={{ background: 'var(--green)', color: 'var(--bg)' }}
              title="Subir cartola"
            >
              <Upload size={18} />
            </button>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {archivoNombre || 'Subí tu cartola bancaria'}
              </div>
              <div className="text-xs mono" style={{ color: 'var(--text-3)' }}>
                {movimientos.length
                  ? `${movimientos.length} movimiento(s) detectado(s)`
                  : 'Excel o CSV (BancoEstado, BCI, Santander, etc.)'}
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              Tolerancia
              <select
                value={tolerancia}
                onChange={(e) => setTolerancia(Number(e.target.value))}
                className="border rounded-full px-3 py-1.5 text-xs"
                style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
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
              className="text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all disabled:opacity-50"
              style={{ background: 'var(--green)', color: 'var(--bg)' }}
            >
              {cargando ? <Loader2 size={14} className="animate-spin" /> : 'Cruzar ahora'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="fade-up rounded-xl border p-4 flex gap-3 mb-6" style={{ borderColor: 'var(--warn)', background: 'var(--warn-bg)' }}>
          <AlertCircle size={18} style={{ color: 'var(--warn)' }} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm" style={{ color: 'var(--warn-text)' }}>{error}</div>
        </div>
      )}

      {resultado && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="fade-up delay-2 rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--green)' }}>
                <CheckCircle2 size={12} />
                <span>Conciliados</span>
              </div>
              <div className="display text-4xl mono" style={{ color: 'var(--green)' }}>{resultado.resumen.matches}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>de {resultado.resumen.totalMovimientos} movimientos</div>
            </div>
            <div className="fade-up delay-3 rounded-xl border p-5" style={{ borderColor: 'var(--warn)', background: 'var(--warn-bg)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--warn)' }}>
                <AlertCircle size={12} />
                <span>Movs. sin factura</span>
              </div>
              <div className="display text-4xl mono" style={{ color: 'var(--warn)' }}>{resultado.resumen.movimientosSinMatch}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--warn-text)' }}>requieren revisión</div>
            </div>
            <div className="fade-up delay-4 rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
                <Receipt size={12} />
                <span>Facturas sin pago</span>
              </div>
              <div className="display text-4xl mono" style={{ color: 'var(--text)' }}>{resultado.resumen.facturasSinMatch}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>posibles atrasos</div>
            </div>
          </div>

          {resultado.matches.length > 0 && (
            <Tabla
              titulo="Conciliados"
              count={resultado.matches.length}
              icono={<CheckCircle2 size={14} style={{ color: 'var(--green)' }} />}
              tone="ok"
            >
              {resultado.matches.map((m, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border-soft)' }}>
                  <td className="px-6 py-3" style={{ color: 'var(--text)' }}>
                    <div className="text-xs mono mb-0.5" style={{ color: 'var(--text-3)' }}>{formatFechaCorta(m.movimiento.fecha)}</div>
                    <div>{m.movimiento.descripcion || '—'}</div>
                  </td>
                  <td className="px-6 py-3" style={{ color: 'var(--text-2)' }}>
                    <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>Factura</div>
                    <div>{m.factura.proveedor} · {formatFechaCorta(m.factura.fecha_emision)}</div>
                  </td>
                  <td className="px-6 py-3 text-right mono" style={{ color: 'var(--green)', fontWeight: 500 }}>{formatCLP(Math.abs(m.movimiento.monto))}</td>
                  <td className="px-6 py-3 text-right text-xs mono" style={{ color: 'var(--text-3)' }}>Δ {m.diferenciaDias}d</td>
                </tr>
              ))}
            </Tabla>
          )}

          {resultado.movimientosSinMatch.length > 0 && (
            <Tabla
              titulo="Movimientos sin factura asociada"
              count={resultado.movimientosSinMatch.length}
              icono={<AlertCircle size={14} style={{ color: 'var(--warn)' }} />}
              tone="warn"
            >
              {resultado.movimientosSinMatch.map((m, i) => (
                <tr key={i} style={{ borderTop: '1px solid #E8D8B5' }}>
                  <td className="px-6 py-3" style={{ color: 'var(--warn-text)' }}>
                    <div className="text-xs mono mb-0.5" style={{ color: 'var(--warn)' }}>{formatFechaCorta(m.fecha)}</div>
                    <div>{m.descripcion || '—'}</div>
                  </td>
                  <td className="px-6 py-3 text-right mono" style={{ color: 'var(--warn-text)', fontWeight: 500 }}>{formatCLP(Math.abs(m.monto))}</td>
                </tr>
              ))}
            </Tabla>
          )}

          {resultado.facturasSinMatch.length > 0 && (
            <Tabla
              titulo="Facturas sin movimiento bancario"
              count={resultado.facturasSinMatch.length}
              icono={<AlertCircle size={14} style={{ color: 'var(--text-3)' }} />}
              tone="neutral"
            >
              {resultado.facturasSinMatch.map((f, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border-soft)' }}>
                  <td className="px-6 py-3" style={{ color: 'var(--text)' }}>
                    <div className="text-xs mono mb-0.5" style={{ color: 'var(--text-3)' }}>{formatFechaCorta(f.fecha_emision)}</div>
                    <div>{f.proveedor || '—'}</div>
                  </td>
                  <td className="px-6 py-3 text-right mono" style={{ color: 'var(--text)', fontWeight: 500 }}>{formatCLP(f.monto_total)}</td>
                </tr>
              ))}
            </Tabla>
          )}
        </>
      )}
    </>
  );
}

function Tabla({ titulo, count, icono, tone, children }) {
  const styles = {
    ok: { borderColor: 'var(--border)', background: 'var(--bg-card)', titleColor: 'var(--text-3)', countColor: 'var(--text)' },
    warn: { borderColor: 'var(--warn)', background: 'var(--warn-bg)', titleColor: 'var(--warn)', countColor: 'var(--warn)' },
    neutral: { borderColor: 'var(--border)', background: 'var(--bg-card)', titleColor: 'var(--text-3)', countColor: 'var(--text)' },
  }[tone];

  return (
    <section className="fade-up rounded-2xl border overflow-hidden mb-6" style={{ borderColor: styles.borderColor, background: styles.background }}>
      <div className="px-6 pt-5 pb-3 flex items-center gap-2">
        {icono}
        <h3 className="text-xs uppercase tracking-widest" style={{ color: styles.titleColor }}>
          {titulo} <span className="mono ml-1" style={{ color: styles.countColor }}>{count}</span>
        </h3>
      </div>
      <table className="w-full text-sm">
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}
```

### 8. `frontend/src/components/Dashboard.jsx`

Reemplazar TODO el contenido por:

```jsx
import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, AlertTriangle, Trophy, BarChart3 } from 'lucide-react';
import { getHistorial } from '../lib/storage.js';

function formatCLP(num) {
  if (typeof num !== 'number' || isNaN(num)) return '—';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(num);
}

function formatCLPCompact(num) {
  if (typeof num !== 'number' || isNaN(num)) return '—';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num}`;
}

function mesLabel(yyyymm) {
  const [y, m] = yyyymm.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }).replace('.', '');
}

function getCuenta(clasificacion) {
  if (!clasificacion) return 'Sin clasificar';
  if (typeof clasificacion === 'string') return clasificacion;
  return clasificacion.cuenta || 'Sin clasificar';
}

export default function Dashboard() {
  const [historial, setHistorial] = useState([]);

  useEffect(() => { setHistorial(getHistorial()); }, []);

  const stats = useMemo(() => {
    if (!historial.length) return null;

    const total = historial.reduce((s, f) => s + (f.totales?.total || 0), 0);
    const promedio = total / historial.length;

    const porMes = {};
    historial.forEach((f) => {
      if (!f.fecha) return;
      const k = f.fecha.slice(0, 7);
      porMes[k] = (porMes[k] || 0) + (f.totales?.total || 0);
    });
    const evolucion = Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ key: k, label: mesLabel(k), monto: v }));
    const maxEvolucion = Math.max(...evolucion.map((e) => e.monto), 1);

    const porCat = {};
    historial.forEach((f) => {
      const c = getCuenta(f.clasificacion_sugerida);
      porCat[c] = (porCat[c] || 0) + (f.totales?.total || 0);
    });
    const categorias = Object.entries(porCat).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value, pct: (value / total) * 100 }));

    const porProv = {};
    historial.forEach((f) => {
      const p = f.emisor?.razon_social || 'Desconocido';
      porProv[p] = (porProv[p] || 0) + (f.totales?.total || 0);
    });
    const top = Object.entries(porProv).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, value]) => ({ name, value, pct: (value / total) * 100 }));

    const alertas = [];
    const altos = historial.filter((f) => (f.totales?.total || 0) > promedio * 3);
    if (altos.length) alertas.push(`${altos.length} factura(s) con monto significativamente sobre el promedio (>3×).`);
    if (top[0] && top[0].pct > 40) alertas.push(`${top[0].name} concentra el ${top[0].pct.toFixed(0)}% del gasto total — alta dependencia de un solo proveedor.`);
    if (evolucion.length >= 2) {
      const ult = evolucion[evolucion.length - 1].monto;
      const prev = evolucion[evolucion.length - 2].monto;
      if (prev > 0 && ult / prev > 1.25) {
        const pct = ((ult / prev - 1) * 100).toFixed(0);
        alertas.push(`El gasto creció ${pct}% respecto al mes anterior.`);
      }
    }

    return { total, promedio, evolucion, maxEvolucion, categorias, top, alertas, count: historial.length };
  }, [historial]);

  if (!stats) {
    return (
      <>
        <header className="mb-10 fade-up">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
            <BarChart3 size={12} />
            <span>Dashboard ejecutivo</span>
          </div>
          <h1 className="display text-4xl md:text-6xl leading-[0.95] mb-4" style={{ color: 'var(--text)' }}>
            Lo que el dueño<br />
            <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>debería ver cada lunes.</em>
          </h1>
        </header>
        <div className="fade-up rounded-2xl border p-10 text-center text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-3)' }}>
          Procesá facturas en la pestaña Procesador para ver el dashboard.
        </div>
      </>
    );
  }

  return (
    <>
      <header className="mb-10 fade-up">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
          <BarChart3 size={12} />
          <span>Dashboard ejecutivo</span>
        </div>
        <h1 className="display text-4xl md:text-6xl leading-[0.95] mb-4" style={{ color: 'var(--text)' }}>
          Lo que el dueño<br />
          <em style={{ color: 'var(--green)', fontStyle: 'italic' }}>debería ver cada lunes.</em>
        </h1>
        <p className="text-base md:text-lg max-w-2xl" style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>
          Evolución mensual, concentración por proveedor, dónde se está yendo la plata y qué alertas merecen una llamada.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Total facturado" value={formatCLPCompact(stats.total)} delay="delay-1" highlight />
        <Stat label="Facturas" value={stats.count} delay="delay-2" />
        <Stat label="Promedio" value={formatCLPCompact(stats.promedio)} delay="delay-3" />
      </div>

      {stats.alertas.length > 0 && (
        <div className="fade-up delay-4 rounded-2xl border p-5 mb-8" style={{ borderColor: 'var(--warn)', background: 'var(--warn-bg)' }}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--warn)' }}>
            <AlertTriangle size={12} />
            <span>Alertas</span>
          </div>
          <ul className="space-y-1.5 text-sm" style={{ color: 'var(--warn-text)' }}>
            {stats.alertas.map((a, i) => <li key={i}>• {a}</li>)}
          </ul>
        </div>
      )}

      <div className="fade-up rounded-2xl border p-6 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <header className="flex items-center gap-2 mb-5">
          <TrendingUp size={14} style={{ color: 'var(--text-2)' }} />
          <h3 className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Evolución mensual</h3>
        </header>
        <div className="flex items-end gap-3 h-48 px-2">
          {stats.evolucion.map((e, i) => (
            <div key={e.key} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-t transition-opacity hover:opacity-85"
                style={{
                  height: `${Math.max(8, (e.monto / stats.maxEvolucion) * 100)}%`,
                  background: 'var(--green)',
                }}
                title={formatCLP(e.monto)}
              ></div>
              <div className="text-xs mono" style={{ color: i === stats.evolucion.length - 1 ? 'var(--text)' : 'var(--text-3)' }}>{e.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="fade-up rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>Gastos por categoría</h3>
          <div className="space-y-3">
            {stats.categorias.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span style={{ color: 'var(--text)' }}>{c.name}</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>{formatCLPCompact(c.value)} · {c.pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                  <div className="h-full" style={{ width: `${c.pct}%`, background: 'var(--green)' }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="fade-up rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <header className="flex items-center gap-2 mb-4">
            <Trophy size={14} style={{ color: 'var(--text-2)' }} />
            <h3 className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Top 5 proveedores</h3>
          </header>
          <div className="space-y-3">
            {stats.top.map((p, i) => (
              <div key={p.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span style={{ color: 'var(--text)' }} className="truncate pr-2">{i + 1}. {p.name}</span>
                  <span className="mono text-xs" style={{ color: 'var(--text-2)' }}>{formatCLPCompact(p.value)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                  <div className="h-full" style={{ width: `${Math.min(100, p.pct)}%`, background: 'var(--green)' }}></div>
                </div>
                <div className="text-xs mono mt-0.5" style={{ color: 'var(--text-3)' }}>{p.pct.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, delay = '', highlight = false }) {
  return (
    <div className={`fade-up ${delay} rounded-xl border p-5`} style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div className="display text-3xl mono" style={{ color: highlight ? 'var(--green)' : 'var(--text)' }}>{value}</div>
    </div>
  );
}
```

---

## Pasos al final

1. Confirmar que el frontend builds sin errores:
   ```
   cd frontend && npm run build
   ```
   Si hay errores, mostrarlos a Felipe sin intentar arreglarlos solo (puede ser que falte alguna config).

2. Si el servidor dev sigue corriendo de la sesión anterior, se recarga solo. Si no:
   ```
   cd .. && npm run dev
   ```

3. Hacer commit del rediseño:
   ```
   git add . && git commit -m "Rediseño Gonfixit: estética editorial + schema rico de facturas + 3 módulos cohesivos"
   git push
   ```

4. Reportar a Felipe:
   - ✅ / ❌ del build
   - URL para probar
   - Recordatorio: si todavía no pegó la `ANTHROPIC_API_KEY` en `backend/.env`, el procesador va a tirar 500. Conciliación y Dashboard funcionan sin la key.
