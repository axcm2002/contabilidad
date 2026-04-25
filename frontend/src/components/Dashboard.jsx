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
