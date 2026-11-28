import { useState } from 'react'

export default function PedidoForm({ zonas, estados, idSugerido, validar, onGuardar, onCancelar }) {
  const [id, setId] = useState(idSugerido)
  const [zona, setZona] = useState(zonas[0] ?? '')
  const [estado, setEstado] = useState(estados[0] ?? '')
  const [error, setError] = useState(null)

  const enviar = (e) => {
    e.preventDefault()
    const pedido = { id: id.trim().toUpperCase(), zona, estado }
    const msg = validar(pedido)
    if (msg) return setError(msg)
    onGuardar(pedido)
  }

  return (
    <form className="pedido-form" onSubmit={enviar}>
      <h3>Nuevo pedido</h3>
      <label>
        <span>ID</span>
        <input value={id} onChange={(e) => { setId(e.target.value); setError(null) }} autoFocus />
      </label>
      <label>
        <span>Zona</span>
        <select value={zona} onChange={(e) => setZona(e.target.value)}>
          {zonas.map((z) => <option key={z}>{z}</option>)}
        </select>
      </label>
      <label>
        <span>Estado</span>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          {estados.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-refresh">Guardar</button>
      </div>
    </form>
  )
}
