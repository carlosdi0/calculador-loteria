const euros = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const formatoEuros = (n) => euros.format(Math.round(n * 100) / 100)

export const formatoFecha = (fecha) =>
  fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })

export const formatoHora = (fecha) =>
  fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })

export function describirBoleto(b) {
  if (b.tipo === 'decimo') {
    return `${b.cantidad} ${b.cantidad === 1 ? 'décimo' : 'décimos'} · ${formatoEuros(b.importe)}`
  }
  return `Participación · juegas ${formatoEuros(b.importe)}`
}
