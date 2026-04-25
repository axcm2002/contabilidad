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
