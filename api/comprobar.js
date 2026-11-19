import { comprobar } from '../lib/comprobar.js'

// GET /api/comprobar?sorteo=navidad&numeros=79432,00048
// Escrito con la API básica de Node para que sirva igual en Vercel y en `vite dev`.
export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const sorteo = url.searchParams.get('sorteo')
  const numeros = (url.searchParams.get('numeros') ?? '')
    .split(',')
    .filter((n) => /^\d{1,5}$/.test(n))

  const { codigo, cuerpo } = await comprobar({ sorteo, numeros })

  res.statusCode = codigo
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', codigo === 200 ? 's-maxage=30, stale-while-revalidate=60' : 'no-store')
  res.end(JSON.stringify(cuerpo))
}
