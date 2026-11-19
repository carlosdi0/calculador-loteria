import { almacen } from '../lib/almacen.js'
import { SORTEOS } from '../lib/sorteos.js'

// GET    /api/lista?id=abc          → { id, boletos: [...] }
// POST   /api/lista?id=abc  {boleto} → guarda (o actualiza) un boleto
// DELETE /api/lista?id=abc&boleto=x → quita un boleto
const ID_LISTA = /^[a-z0-9]{6,16}$/

function validarBoleto(b) {
  if (!b || typeof b !== 'object') return null
  const limpio = {
    id: String(b.id ?? ''),
    sorteo: b.sorteo,
    anio: Number(b.anio),
    numero: String(b.numero ?? ''),
    tipo: b.tipo,
    cantidad: Number(b.cantidad),
    importe: Number(b.importe),
    nota: String(b.nota ?? '').trim().slice(0, 60),
    creado: Number(b.creado) || Date.now(),
  }
  const ok =
    /^[\w-]{1,40}$/.test(limpio.id) &&
    SORTEOS[limpio.sorteo] &&
    Number.isInteger(limpio.anio) &&
    /^\d{5}$/.test(limpio.numero) &&
    ['decimo', 'participacion'].includes(limpio.tipo) &&
    Number.isInteger(limpio.cantidad) &&
    limpio.cantidad >= 1 &&
    limpio.cantidad <= 99 &&
    limpio.importe > 0 &&
    limpio.importe <= 2000
  return ok ? limpio : null
}

async function leerCuerpo(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  let texto = ''
  for await (const trozo of req) texto += trozo
  return JSON.parse(texto || '{}')
}

function responder(res, codigo, cuerpo) {
  res.statusCode = codigo
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(cuerpo))
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const id = url.searchParams.get('id') ?? ''
  if (!ID_LISTA.test(id)) return responder(res, 400, { error: 'Lista no válida' })

  const db = almacen()
  if (!db) return responder(res, 503, { error: 'Base de datos no configurada' })

  try {
    if (req.method === 'GET') {
      const boletos = await db.leer(id)
      boletos.sort((a, b) => a.creado - b.creado)
      return responder(res, 200, { id, boletos })
    }
    if (req.method === 'POST') {
      const boleto = validarBoleto((await leerCuerpo(req)).boleto)
      if (!boleto) return responder(res, 400, { error: 'Datos del número no válidos' })
      await db.guardar(id, boleto)
      return responder(res, 200, { ok: true, boleto })
    }
    if (req.method === 'DELETE') {
      await db.borrar(id, url.searchParams.get('boleto') ?? '')
      return responder(res, 200, { ok: true })
    }
    return responder(res, 405, { error: 'Método no permitido' })
  } catch (e) {
    return responder(res, e.codigo ?? 500, { error: e.codigo ? e.message : 'Error guardando la lista' })
  }
}
