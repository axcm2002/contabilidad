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
