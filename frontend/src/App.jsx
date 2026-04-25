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
