import { useEffect, useMemo, useState } from 'react'
import { SORTEOS, calcularPremio, fechaSorteo, temporada } from '../lib/sorteos.js'
import { describirBoleto, formatoEuros, formatoFecha, formatoHora } from './formato.js'
import Formulario from './Formulario.jsx'
import Compartir from './Compartir.jsx'
import Nota from './Nota.jsx'
import { listasRecientes, useLista } from './useLista.js'

const DIA = 86400000

function sorteoInicial() {
  const ahora = new Date()
  return ahora > new Date(fechaSorteo('navidad', ahora).getTime() + 2 * DIA) ? 'nino' : 'navidad'
}

const EJEMPLO = [
  { id: 'e1', numero: '79432', tipo: 'decimo', cantidad: 1, importe: 20, nota: 'El Gordo de 2025' },
  { id: 'e2', numero: '00048', tipo: 'participacion', cantidad: 1, importe: 5, nota: 'Peña del bar' },
  { id: 'e3', numero: '27182', tipo: 'decimo', cantidad: 2, importe: 40, nota: 'Del trabajo' },
  { id: 'e4', numero: '31415', tipo: 'decimo', cantidad: 1, importe: 20, nota: 'Lotería de la familia' },
]

export default function App() {
  const lista = useLista()
  const { boletos } = lista
  const [sorteo, setSorteo] = useState(sorteoInicial)
  const [resultado, setResultado] = useState(null)
  const [ejemplo, setEjemplo] = useState(null)
  const [recarga, setRecarga] = useState(0)

  const anio = temporada()
  const fecha = fechaSorteo(sorteo)
  const yaSorteado = Date.now() >= fecha.getTime()

  const misBoletos = ejemplo
    ? EJEMPLO
    : boletos.filter((b) => b.sorteo === sorteo && b.anio === anio)
  const numeros = [...new Set(misBoletos.map((b) => b.numero))].sort().join(',')

  // Pide los premios el día del sorteo y, mientras no sean definitivos, cada minuto.
  useEffect(() => {
    if (ejemplo) return setResultado({ estado: 'oficial', premios: ejemplo })
    setResultado(null)
    if (!yaSorteado || !numeros) return

    let cancelado = false
    let temporizador
    async function cargar() {
      setResultado((r) => (r ? { ...r, cargando: true } : { cargando: true }))
      try {
        const res = await fetch(`/api/comprobar?sorteo=${sorteo}&numeros=${numeros}`)
        const datos = await res.json()
        if (cancelado) return
        setResultado(datos)
        if (['en_curso', 'provisional', 'pendiente', 'sin_datos'].includes(datos.estado)) {
          temporizador = setTimeout(cargar, 60000)
        }
      } catch {
        if (cancelado) return
        setResultado({ estado: 'sin_datos', premios: {} })
        temporizador = setTimeout(cargar, 60000)
      }
    }
    cargar()
    return () => {
      cancelado = true
      clearTimeout(temporizador)
    }
  }, [sorteo, numeros, yaSorteado, ejemplo, recarga])

  const hayPremios = resultado?.premios && ['en_curso', 'provisional', 'oficial'].includes(resultado.estado)

  const totales = useMemo(() => {
    const t = { jugado: 0, bruto: 0, impuesto: 0, neto: 0 }
    for (const b of misBoletos) {
      t.jugado += b.importe
      if (!hayPremios) continue
      const p = calcularPremio(resultado.premios[b.numero] ?? 0, b.importe)
      t.bruto += p.bruto
      t.impuesto += p.impuesto
      t.neto += p.neto
    }
    return t
  }, [misBoletos, hayPremios, resultado])

  function anadir(datos) {
    lista.guardar({ ...datos, id: crypto.randomUUID(), sorteo, anio, creado: Date.now() })
  }

  function borrar(b) {
    if (window.confirm(`¿Quitar el ${b.numero} de la lista?`)) lista.quitar(b)
  }

  const otrasListas = listasRecientes().filter((l) => l.id !== lista.id && l.total > 0)

  async function verEjemplo() {
    const datos = await fetch('/demo/navidad-2025.json').then((r) => r.json())
    setSorteo('navidad')
    setEjemplo(datos.premios)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="app">
      <header className="cabecera">
        <h1>Calculador de Lotería</h1>
        <p>Apunta tus décimos y participaciones. El día del sorteo te decimos cuánto has ganado.</p>
      </header>

      {ejemplo ? (
        <div className="aviso-ejemplo">
          <span>
            Esto es un <strong>ejemplo</strong> con el sorteo de Navidad 2025.
          </span>
          <button onClick={() => setEjemplo(null)}>Salir del ejemplo</button>
        </div>
      ) : (
        <nav className="pestanas" aria-label="Sorteo">
          {Object.values(SORTEOS).map((s) => (
            <button
              key={s.id}
              className={sorteo === s.id ? 'activo' : ''}
              aria-current={sorteo === s.id}
              onClick={() => setSorteo(s.id)}
            >
              {s.corto}
              <small>{s.fechaCorta}</small>
            </button>
          ))}
        </nav>
      )}

      <Resumen
        sorteo={SORTEOS[sorteo]}
        fecha={fecha}
        yaSorteado={yaSorteado || !!ejemplo}
        resultado={resultado}
        hayPremios={hayPremios}
        totales={totales}
        hayBoletos={misBoletos.length > 0}
        onRecargar={() => setRecarga((n) => n + 1)}
      />

      {misBoletos.length > 0 && (
        <section className="tarjeta">
          <h2>Tus números</h2>
          <ul className="lista">
            {misBoletos.map((b) => {
              const porDecimo = resultado?.premios?.[b.numero]
              const { bruto } = calcularPremio(porDecimo ?? 0, b.importe)
              return (
                <li key={b.id} className={hayPremios && bruto > 0 ? 'premiado' : ''}>
                  <span className="numero">{b.numero}</span>
                  <span className="detalle">
                    {describirBoleto(b)}
                    {ejemplo ? (
                      <em>{b.nota}</em>
                    ) : (
                      <Nota valor={b.nota} onGuardar={(nota) => lista.guardar({ ...b, nota })} />
                    )}
                  </span>
                  {hayPremios && (
                    <span className="premio">
                      {bruto > 0 ? `+${formatoEuros(bruto)}` : 'Sin premio'}
                      {bruto > 0 && <small>{formatoEuros(porDecimo)} por décimo</small>}
                    </span>
                  )}
                  {!ejemplo && (
                    <button className="borrar" aria-label={`Quitar el ${b.numero}`} onClick={() => borrar(b)}>
                      ×
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {lista.aviso && !ejemplo && (
        <p className="aviso-error" role="alert">
          {lista.aviso}
        </p>
      )}

      {!ejemplo && lista.id && boletos.length > 0 && <Compartir id={lista.id} />}

      {!ejemplo && <Formulario onAnadir={anadir} />}

      <footer className="pie">
        {!ejemplo && (
          <button className="boton-secundario" onClick={verEjemplo}>
            Ver un ejemplo con el sorteo de 2025
          </button>
        )}
        {!ejemplo && (lista.id || otrasListas.length > 0) && (
          <div className="otras-listas">
            {otrasListas.length > 0 && <p>Otras listas abiertas en este dispositivo:</p>}
            {otrasListas.map((l) => (
              <a
                key={l.id}
                href={`/l/${l.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  lista.abrir(l.id)
                }}
              >
                {l.boletos
                  .slice(0, 3)
                  .map((b) => b.numero)
                  .join(', ')}
                {l.total > 3 && '…'} ({l.total} {l.total === 1 ? 'número' : 'números'})
              </a>
            ))}
            {lista.id && (
              <button className="enlace" onClick={() => lista.abrir(null)}>
                Empezar una lista nueva
              </button>
            )}
          </div>
        )}
        <p>
          Tu lista se guarda en internet con un enlace privado: quien tenga el enlace puede verla y cambiarla. Los
          resultados vienen de fuentes no oficiales y son orientativos: comprueba siempre tu décimo en{' '}
          <a href="https://www.loteriasyapuestas.es" target="_blank" rel="noreferrer">
            loteriasyapuestas.es
          </a>{' '}
          antes de cobrarlo.
        </p>
        <p>
          Los premios de más de 40.000 € por décimo pagan un 20 % a Hacienda por lo que exceda de esa cantidad. Los
          premios de más de 2.000 € se cobran en el banco.
        </p>
      </footer>
    </main>
  )
}

function Resumen({ sorteo, fecha, yaSorteado, resultado, hayPremios, totales, hayBoletos, onRecargar }) {
  if (!yaSorteado) {
    const dias = Math.ceil((fecha - Date.now()) / DIA)
    const esHoy = fecha.toDateString() === new Date().toDateString()
    return (
      <section className="tarjeta resumen">
        <p className="grande">{esHoy ? 'Hoy es el sorteo' : dias === 1 ? 'Mañana es el sorteo' : `Faltan ${dias} días`}</p>
        <p>
          {sorteo.nombre}: {formatoFecha(fecha)}, a las {formatoHora(fecha)}.
        </p>
        {hayBoletos ? (
          <p className="jugado">Llevas jugados {formatoEuros(totales.jugado)}. Vuelve ese día para ver si te ha tocado.</p>
        ) : (
          <p className="jugado">Empieza añadiendo tus números aquí abajo.</p>
        )}
      </section>
    )
  }

  if (!hayBoletos) {
    return (
      <section className="tarjeta resumen">
        <p className="grande">Ya se ha celebrado el sorteo</p>
        <p>Añade tus números y te decimos al momento si te ha tocado.</p>
      </section>
    )
  }

  if (!hayPremios) {
    const sinDatos = resultado && !resultado.cargando
    return (
      <section className="tarjeta resumen" aria-live="polite">
        <p className="grande">{sinDatos ? 'Aún no hay resultados' : 'Buscando resultados…'}</p>
        {sinDatos && (
          <>
            <p>
              Los resultados aparecen en cuanto empieza el sorteo. Lo volvemos a intentar cada minuto.
            </p>
            <button className="boton-secundario" onClick={onRecargar}>
              Reintentar ahora
            </button>
          </>
        )}
      </section>
    )
  }

  const enCurso = resultado.estado === 'en_curso'
  const balance = totales.neto - totales.jugado
  return (
    <section className={`tarjeta resumen ${totales.bruto > 0 ? 'ganador' : ''}`} aria-live="polite">
      <span className={`estado estado-${resultado.estado}`}>
        {enCurso ? 'Sorteo en marcha' : resultado.estado === 'oficial' ? 'Lista oficial' : 'Resultados provisionales'}
      </span>
      {totales.bruto > 0 ? (
        <>
          <p>¡Te ha tocado!</p>
          <p className="cifra">{formatoEuros(totales.bruto)}</p>
        </>
      ) : (
        <p className="grande">{enCurso ? 'De momento no te ha tocado nada' : 'Esta vez no ha habido suerte'}</p>
      )}
      <dl className="cuentas">
        <dt>Has jugado</dt>
        <dd>{formatoEuros(totales.jugado)}</dd>
        {totales.impuesto > 0 && (
          <>
            <dt>Hacienda se queda</dt>
            <dd>−{formatoEuros(totales.impuesto)}</dd>
            <dt>Te quedan</dt>
            <dd>{formatoEuros(totales.neto)}</dd>
          </>
        )}
        <dt>Balance</dt>
        <dd className={balance >= 0 ? 'positivo' : 'negativo'}>
          {balance >= 0 ? '+' : '−'}
          {formatoEuros(Math.abs(balance))}
        </dd>
      </dl>
      {enCurso && <p className="ayuda">Se actualiza solo cada minuto mientras dura el sorteo.</p>}
    </section>
  )
}
