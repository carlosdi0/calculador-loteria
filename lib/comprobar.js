import { fechaSorteo, normalizarNumero } from './sorteos.js'

// Fuentes no oficiales (la web de SELAE bloquea las peticiones automáticas).
//  - "lista": JSON completo con todos los números premiados, publicado en GitHub Pages.
//    Formato: { status: "0..4", "79432": "4000000", ... } con importes por billete (10 décimos).
//  - "elpais": API histórica de El País, un número por petición. Respuesta: busqueda={...}
const FUENTES = {
  navidad: {
    lista: 'https://api-loteria.pabloclementeperez.com/output/LoteriaNavidad.json',
    elpais: 'https://api.elpais.com/ws/LoteriaNavidadPremiados',
  },
  nino: {
    lista: 'https://api-loteria.pabloclementeperez.com/output/LoteriaNino.json',
    elpais: 'https://api.elpais.com/ws/LoteriaNinoPremiados',
  },
}

// Códigos de estado de El País (los replica también la "lista").
const ESTADOS = { 0: 'pendiente', 1: 'en_curso', 2: 'provisional', 3: 'provisional', 4: 'oficial' }
const HORAS = 3600 * 1000
const CACHE_MS = 30 * 1000
const cache = new Map()

async function pedir(url) {
  return fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (calculador-loteria)' },
    signal: AbortSignal.timeout(8000),
  })
}

async function descargarLista(url) {
  const guardado = cache.get(url)
  if (guardado && Date.now() - guardado.t < CACHE_MS) return guardado

  const res = await pedir(url)
  if (!res.ok) throw new Error(`lista HTTP ${res.status}`)
  const json = await res.json()
  const premios = {}
  for (const [k, v] of Object.entries(json)) {
    if (/^\d{1,5}$/.test(k)) premios[normalizarNumero(k)] = Number(v) / 10
  }
  const descarga = {
    t: Date.now(),
    modificado: new Date(res.headers.get('last-modified') ?? 0),
    status: Number(json.status),
    premios,
  }
  cache.set(url, descarga)
  return descarga
}

async function desdeLista(url, inicioSorteo, ahora) {
  const { modificado, status, premios } = await descargarLista(url)

  // El fichero sigue mostrando el sorteo del año anterior hasta que lo actualizan:
  // solo nos fiamos de él si se ha modificado el mismo día del sorteo o después.
  const inicioDia = new Date(inicioSorteo.getTime() - 9 * HORAS)
  if (!(modificado >= inicioDia)) throw new Error('lista de una edición anterior')
  if (status === 4 && ahora.getTime() < inicioSorteo.getTime() + 3 * HORAS) {
    throw new Error('lista oficial imposible tan pronto: datos antiguos')
  }

  return { estado: ESTADOS[status] ?? 'en_curso', fuente: 'lista', premios }
}

async function desdeElPais(url, numeros) {
  let status = 0
  const premios = {}
  await Promise.all(
    numeros.map(async (n) => {
      const res = await pedir(`${url}?n=${Number(n)}`)
      const txt = await res.text()
      const json = JSON.parse(txt.slice(txt.indexOf('=') + 1))
      if (json.error) throw new Error('El País sin datos')
      premios[n] = Number(json.premio) || 0
      status = Math.max(status, Number(json.status) || 0)
    }),
  )
  return { estado: ESTADOS[status] ?? 'en_curso', fuente: 'elpais', premios }
}

export async function comprobar({ sorteo, numeros, ahora = new Date() }) {
  const fuentes = FUENTES[sorteo]
  if (!fuentes) return { codigo: 400, cuerpo: { error: 'Sorteo no válido' } }

  const lista = [...new Set(numeros.map(normalizarNumero))].slice(0, 100)
  const inicio = fechaSorteo(sorteo, ahora)
  if (ahora < inicio) {
    return { codigo: 200, cuerpo: { estado: 'pendiente', fecha: inicio.toISOString(), premios: {} } }
  }

  const errores = []
  for (const intento of [() => desdeLista(fuentes.lista, inicio, ahora), () => desdeElPais(fuentes.elpais, lista)]) {
    try {
      const datos = await intento()
      const premios = Object.fromEntries(lista.map((n) => [n, datos.premios[n] ?? 0]))
      return {
        codigo: 200,
        cuerpo: { estado: datos.estado, fuente: datos.fuente, actualizado: new Date().toISOString(), premios },
      }
    } catch (e) {
      errores.push(e.message)
    }
  }
  return { codigo: 503, cuerpo: { estado: 'sin_datos', premios: {}, errores } }
}
