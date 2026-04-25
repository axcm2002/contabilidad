export async function procesarFactura(file) {
  const fd = new FormData();
  fd.append('archivo', file);
  const res = await fetch('/api/facturas/procesar', { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error procesando factura');
  }
  return res.json();
}

export async function cruzarConciliacion(movimientos, facturas, toleranciaDias = 5) {
  const res = await fetch('/api/conciliacion/cruzar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movimientos, facturas, toleranciaDias }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error cruzando datos');
  }
  return res.json();
}
