import { useState } from 'react'
import { PRECIO_DECIMO, normalizarNumero } from '../lib/sorteos.js'
import { formatoEuros } from './formato.js'

export default function Formulario({ onAnadir }) {
  const [numero, setNumero] = useState('')
  const [tipo, setTipo] = useState('decimo')
  const [cantidad, setCantidad] = useState(1)
  const [importe, setImporte] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')

  function enviar(e) {
    e.preventDefault()
    if (!/^\d{1,5}$/.test(numero)) return setError('Escribe el número del décimo (5 cifras).')

    let jugado = cantidad * PRECIO_DECIMO
    if (tipo === 'participacion') {
      jugado = Number(importe.replace(',', '.'))
      if (!(jugado > 0) || jugado > 1000) return setError('Indica cuántos euros juegas en la participación.')
    }

    onAnadir({ numero: normalizarNumero(numero), tipo, cantidad, importe: jugado, nota: nota.trim() })
    setNumero('')
    setCantidad(1)
    setImporte('')
    setNota('')
    setError('')
    document.getElementById('numero')?.focus()
  }

  return (
    <form className="tarjeta formulario" onSubmit={enviar} noValidate>
      <h2>Añadir un número</h2>

      <label htmlFor="numero">Número</label>
      <input
        id="numero"
        className="input-numero"
        inputMode="numeric"
        autoComplete="off"
        placeholder="00000"
        maxLength={5}
        value={numero}
        onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
        onBlur={() => numero && setNumero(normalizarNumero(numero))}
      />

      <span className="etiqueta" id="tipo-label">¿Qué tienes?</span>
      <div className="segmentado" role="radiogroup" aria-labelledby="tipo-label">
        {[
          ['decimo', 'Décimo'],
          ['participacion', 'Participación'],
        ].map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={tipo === valor}
            className={tipo === valor ? 'activo' : ''}
            onClick={() => setTipo(valor)}
          >
            {texto}
          </button>
        ))}
      </div>

      {tipo === 'decimo' ? (
        <>
          <span className="etiqueta">¿Cuántos décimos de este número?</span>
          <div className="contador">
            <button type="button" aria-label="Uno menos" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>
              −
            </button>
            <output aria-live="polite">
              {cantidad} <small>({formatoEuros(cantidad * PRECIO_DECIMO)})</small>
            </output>
            <button type="button" aria-label="Uno más" onClick={() => setCantidad((c) => Math.min(99, c + 1))}>
              +
            </button>
          </div>
        </>
      ) : (
        <>
          <label htmlFor="importe">¿Cuántos euros juegas?</label>
          <div className="input-euros">
            <input
              id="importe"
              inputMode="decimal"
              placeholder="5"
              value={importe}
              onChange={(e) => setImporte(e.target.value.replace(/[^\d.,]/g, ''))}
            />
            <span>€</span>
          </div>
          <p className="ayuda">Viene escrito en la participación: «juega X euros». No cuentes el donativo.</p>
        </>
      )}

      <label htmlFor="nota">
        Nota <span className="opcional">(opcional)</span>
      </label>
      <input
        id="nota"
        placeholder="Del trabajo, de la peña, del bar…"
        maxLength={60}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="boton-principal">
        Añadir
      </button>
    </form>
  )
}
