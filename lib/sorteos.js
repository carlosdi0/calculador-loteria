// Lógica compartida entre la web y la función de Vercel.

export const PRECIO_DECIMO = 20

// Desde 2023 los premios de lotería tributan un 20 % por lo que pase de
// 40.000 € por décimo (proporcional en participaciones).
export const EXENCION_POR_DECIMO = 40000
export const TIPO_GRAVAMEN = 0.2

export const SORTEOS = {
  navidad: { id: 'navidad', nombre: 'Lotería de Navidad', corto: 'Navidad', fechaCorta: '22 dic' },
  nino: { id: 'nino', nombre: 'Sorteo del Niño', corto: 'El Niño', fechaCorta: '6 ene' },
}

// La "temporada" va de febrero a enero: Navidad (22/12/Y) y Niño (6/1/Y+1).
export function temporada(ahora = new Date()) {
  return ahora.getUTCMonth() >= 1 ? ahora.getUTCFullYear() : ahora.getUTCFullYear() - 1
}

// Ambos sorteos caen en horario de invierno (UTC+1).
export function fechaSorteo(id, ahora = new Date()) {
  const y = temporada(ahora)
  return id === 'navidad'
    ? new Date(`${y}-12-22T09:00:00+01:00`)
    : new Date(`${y + 1}-01-06T12:00:00+01:00`)
}

export function calcularPremio(premioPorDecimo, importeJugado) {
  const fraccion = importeJugado / PRECIO_DECIMO
  const bruto = premioPorDecimo * fraccion
  const impuesto = Math.max(0, bruto - EXENCION_POR_DECIMO * fraccion) * TIPO_GRAVAMEN
  return { bruto, impuesto, neto: bruto - impuesto }
}

export const normalizarNumero = (n) => String(n).replace(/\D/g, '').slice(-5).padStart(5, '0')
