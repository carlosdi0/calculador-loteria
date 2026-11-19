// Almacén de listas sobre Upstash Redis (API REST, sin dependencias).
// Cada lista es un hash: lista:<id> → { <idBoleto>: JSON del boleto }.
// Así añadir o quitar un número es atómico y dos personas no se pisan.
// Sin credenciales y fuera de Vercel usa un almacén en memoria para desarrollo.

const URL_REDIS = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const CADUCIDAD_S = 400 * 24 * 3600 // una temporada y un poco más

export const MAX_BOLETOS = 200

async function pipeline(comandos) {
  const res = await fetch(`${URL_REDIS}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(comandos),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`)
  const resultados = await res.json()
  const fallo = resultados.find((r) => r.error)
  if (fallo) throw new Error(fallo.error)
  return resultados.map((r) => r.result)
}

const clave = (id) => `lista:${id}`

const redis = {
  async leer(id) {
    const [plano] = await pipeline([['HGETALL', clave(id)]])
    const boletos = []
    for (let i = 0; i < plano.length; i += 2) boletos.push(JSON.parse(plano[i + 1]))
    return boletos
  },
  async guardar(id, boleto) {
    const [total] = await pipeline([['HLEN', clave(id)]])
    if (total >= MAX_BOLETOS) throw Object.assign(new Error('Lista llena'), { codigo: 409 })
    await pipeline([
      ['HSET', clave(id), boleto.id, JSON.stringify(boleto)],
      ['EXPIRE', clave(id), CADUCIDAD_S],
    ])
  },
  async borrar(id, idBoleto) {
    await pipeline([['HDEL', clave(id), idBoleto]])
  },
}

const listas = new Map()
const memoria = {
  async leer(id) {
    return [...(listas.get(id)?.values() ?? [])]
  },
  async guardar(id, boleto) {
    if (!listas.has(id)) listas.set(id, new Map())
    listas.get(id).set(boleto.id, boleto)
  },
  async borrar(id, idBoleto) {
    listas.get(id)?.delete(idBoleto)
  },
}

export function almacen() {
  if (URL_REDIS && TOKEN) return redis
  if (!process.env.VERCEL) return memoria
  return null
}
