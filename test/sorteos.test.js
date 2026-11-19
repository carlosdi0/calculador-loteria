import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularPremio, fechaSorteo, normalizarNumero } from '../lib/sorteos.js'
import { comprobar } from '../lib/comprobar.js'

test('el Gordo tributa por lo que pasa de 40.000 €', () => {
  const p = calcularPremio(400000, 20)
  assert.equal(p.bruto, 400000)
  assert.equal(p.impuesto, 72000)
  assert.equal(p.neto, 328000)
})

test('una participación de 5 € cobra y tributa en proporción', () => {
  const p = calcularPremio(400000, 5)
  assert.equal(p.bruto, 100000)
  assert.equal(p.impuesto, 18000)
})

test('los premios pequeños no tributan', () => {
  assert.equal(calcularPremio(100, 40).impuesto, 0)
  assert.equal(calcularPremio(100, 40).bruto, 200)
})

test('fechas de sorteo según la temporada', () => {
  const nov = new Date('2026-11-19T10:00:00Z')
  assert.equal(fechaSorteo('navidad', nov).toISOString(), '2026-12-22T08:00:00.000Z')
  assert.equal(fechaSorteo('nino', nov).toISOString(), '2027-01-06T11:00:00.000Z')
  const ene = new Date('2027-01-10T10:00:00Z')
  assert.equal(fechaSorteo('navidad', ene).toISOString(), '2026-12-22T08:00:00.000Z')
})

test('normaliza números a 5 cifras', () => {
  assert.equal(normalizarNumero('48'), '00048')
  assert.equal(normalizarNumero('79432'), '79432')
})

test('antes del sorteo no se consulta ninguna fuente', async () => {
  const r = await comprobar({ sorteo: 'navidad', numeros: ['79432'], ahora: new Date('2026-11-19T10:00:00Z') })
  assert.equal(r.cuerpo.estado, 'pendiente')
})
