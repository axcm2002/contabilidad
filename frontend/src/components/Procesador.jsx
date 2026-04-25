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
