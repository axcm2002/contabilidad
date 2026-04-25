const KEY = 'procesador-facturas-historial';

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

export function addFactura(factura) {
  const items = getHistorial();
  const conId = {
    ...factura,
    id: crypto.randomUUID(),
    procesada_en: new Date().toISOString(),
  };
  items.unshift(conId);
  saveHistorial(items);
  return conId;
}

export function removeFactura(id) {
  saveHistorial(getHistorial().filter((f) => f.id !== id));
}

export function clearHistorial() {
  localStorage.removeItem(KEY);
}
