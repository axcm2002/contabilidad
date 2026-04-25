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
