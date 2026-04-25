import { useState } from 'react';
import { FileText, Banknote, BarChart3 } from 'lucide-react';
import Procesador from './components/Procesador.jsx';
import Conciliacion from './components/Conciliacion.jsx';
import Dashboard from './components/Dashboard.jsx';

const TABS = [
  { id: 'procesador', label: 'Procesador', icon: FileText },
  { id: 'conciliacion', label: 'Conciliación', icon: Banknote },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
];

export default function App() {
  const [tab, setTab] = useState('procesador');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-stone-900 grid place-items-center text-white font-bold">
              F
            </div>
            <div className="text-sm font-semibold text-stone-900">
              Procesador de Facturas
            </div>
          </div>
          <nav className="flex gap-1 bg-stone-100 p-1 rounded-lg">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition ${
                  tab === id
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'procesador' && <Procesador />}
        {tab === 'conciliacion' && <Conciliacion />}
        {tab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  );
}
