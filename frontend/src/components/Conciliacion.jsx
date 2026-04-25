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
