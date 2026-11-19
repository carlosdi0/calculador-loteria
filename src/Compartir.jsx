import { useState } from 'react'

export default function Compartir({ id }) {
  const [copiado, setCopiado] = useState(false)
  const enlace = `${location.origin}/l/${id}`
  const texto = 'Estos son los números de lotería que jugamos. Ábrelo el día del sorteo para ver cuánto nos ha tocado:'

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace)
    } catch {
      window.prompt('Copia este enlace:', enlace)
      return
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mis números de lotería', text: texto, url: enlace })
      } catch {
        /* el usuario ha cerrado el menú de compartir */
      }
      return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${enlace}`)}`, '_blank', 'noopener')
  }

  return (
    <section className="tarjeta compartir">
      <h2>Guarda o comparte tu lista</h2>
      <p>Con este enlace puedes volver a abrirla desde cualquier móvil u ordenador, o compartirla con tu familia o tu peña.</p>
      <code className="enlace-lista">{enlace.replace(/^https?:\/\//, '')}</code>
      <div className="botones">
        <button className="boton-secundario" onClick={copiar} aria-live="polite">
          {copiado ? '¡Copiado!' : 'Copiar'}
        </button>
        <button className="boton-secundario" onClick={compartir}>
          Compartir
        </button>
      </div>
    </section>
  )
}
