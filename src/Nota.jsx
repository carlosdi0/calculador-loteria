import { useState } from 'react'

// Nota de un número: se toca para escribirla o cambiarla.
export default function Nota({ valor, onGuardar }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(valor ?? '')

  if (!editando) {
    return (
      <button
        className={`nota ${valor ? '' : 'nota-vacia'}`}
        onClick={() => {
          setTexto(valor ?? '')
          setEditando(true)
        }}
      >
        {valor || '+ Añadir nota'}
      </button>
    )
  }

  function terminar() {
    setEditando(false)
    if (texto.trim() !== (valor ?? '')) onGuardar(texto.trim())
  }

  return (
    <input
      className="nota-input"
      autoFocus
      maxLength={60}
      value={texto}
      placeholder="Del trabajo, de la peña…"
      aria-label="Nota"
      onChange={(e) => setTexto(e.target.value)}
      onBlur={terminar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setTexto(valor ?? '')
          setEditando(false)
        }
      }}
    />
  )
}
