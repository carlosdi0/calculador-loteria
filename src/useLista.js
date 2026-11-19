import { useCallback, useEffect, useRef, useState } from 'react'

const CLAVE_LISTAS = 'loteria.listas.v1'
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789'
const REFRESCO_MS = 30000

const leerLocal = (clave, porDefecto) => {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? porDefecto
  } catch {
    return porDefecto
  }
}
const guardarLocal = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    /* sin almacenamiento local: no pasa nada, la lista vive en el servidor */
  }
}

function nuevoId() {
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('')
}

const idDeRuta = () => location.pathname.match(/^\/l\/([a-z0-9]{6,16})\/?$/)?.[1] ?? null

// Listas que se han abierto en este dispositivo, la más reciente primero.
export const listasRecientes = () => leerLocal(CLAVE_LISTAS, [])

function recordarLista(id, boletos) {
  const otras = listasRecientes().filter((l) => l.id !== id)
  guardarLocal(CLAVE_LISTAS, [{ id, total: boletos.length, visto: Date.now(), boletos }, ...otras].slice(0, 10))
}

async function api(metodo, id, { boleto, idBoleto } = {}) {
  const params = new URLSearchParams({ id })
  if (idBoleto) params.set('boleto', idBoleto)
  const res = await fetch(`/api/lista?${params}`, {
    method: metodo,
    headers: boleto ? { 'Content-Type': 'application/json' } : undefined,
    body: boleto ? JSON.stringify({ boleto }) : undefined,
  })
  const datos = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(datos.error ?? 'Error de conexión')
  return datos
}

export function useLista() {
  const [id, setId] = useState(() => idDeRuta() ?? listasRecientes()[0]?.id ?? null)
  // Pintamos al instante la última copia local y luego la del servidor.
  const [boletos, setBoletos] = useState(() => listasRecientes().find((l) => l.id === id)?.boletos ?? [])
  const [cargando, setCargando] = useState(!!id)
  const [aviso, setAviso] = useState('')
  // Cambia con cada modificación: si una lectura empezó antes, su resultado ya no vale.
  const version = useRef(0)
  const enVuelo = useRef(0)

  useEffect(() => {
    if (id && location.pathname !== `/l/${id}`) history.replaceState(null, '', `/l/${id}`)
    if (!id && location.pathname !== '/') history.replaceState(null, '', '/')
  }, [id])

  useEffect(() => {
    if (id) recordarLista(id, boletos)
  }, [id, boletos])

  const refrescar = useCallback(async () => {
    if (!id) return
    const inicio = version.current
    try {
      const datos = await api('GET', id)
      if (version.current === inicio && enVuelo.current === 0) setBoletos(datos.boletos)
      setAviso('')
    } catch {
      setAviso('No se puede conectar. Mostramos la última copia guardada en este dispositivo.')
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => {
    refrescar()
    const intervalo = setInterval(refrescar, REFRESCO_MS)
    const alVolver = () => document.visibilityState === 'visible' && refrescar()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [refrescar])

  async function modificar(cambioLocal, peticion) {
    const anteriores = boletos
    version.current++
    enVuelo.current++
    setBoletos(cambioLocal)
    try {
      await peticion()
      setAviso('')
    } catch (e) {
      setBoletos(anteriores)
      setAviso(`No se ha podido guardar: ${e.message}. Inténtalo de nuevo.`)
    } finally {
      enVuelo.current--
      version.current++
    }
  }

  function guardar(boleto) {
    const lista = id ?? nuevoId()
    if (!id) setId(lista)
    const existe = boletos.some((b) => b.id === boleto.id)
    return modificar(
      (bs) => (existe ? bs.map((b) => (b.id === boleto.id ? boleto : b)) : [...bs, boleto]),
      () => api('POST', lista, { boleto }),
    )
  }

  function quitar(boleto) {
    return modificar(
      (bs) => bs.filter((b) => b.id !== boleto.id),
      () => api('DELETE', id, { idBoleto: boleto.id }),
    )
  }

  function abrir(nuevo) {
    version.current++
    setId(nuevo)
    setBoletos(listasRecientes().find((l) => l.id === nuevo)?.boletos ?? [])
    setCargando(!!nuevo)
  }

  return { id, boletos, cargando, aviso, guardar, quitar, abrir }
}
