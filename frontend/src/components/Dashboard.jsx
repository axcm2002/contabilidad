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
