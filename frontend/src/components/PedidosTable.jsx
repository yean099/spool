const estadoBadge = (estado) => {
  const map = {
    'En ruta': { bg: 'rgba(56,189,248,.15)', color: '#38bdf8', label: '🚚 En ruta' },
    'Entregado': { bg: 'rgba(34,197,94,.15)', color: '#22c55e', label: '✅ Entregado' },
    'Pendiente': { bg: 'rgba(234,179,8,.15)', color: '#eab308', label: '⏳ Pendiente' },
    'En preparación': { bg: 'rgba(249,115,22,.15)', color: '#f97316', label: '🔧 En preparación' },
  }
  const s = map[estado] ?? { bg: 'rgba(148,163,184,.1)', color: '#94a3b8', label: estado }
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: '999px', padding: '0.2rem 0.75rem',
      fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap'
    }}>
      {s.label}
    </span>
  )
}

export default function PedidosTable({ pedidos, loading }) {
  if (loading && pedidos.length === 0) {
    return (
      <div className="table-wrap">
        <table className="pedidos-table">
          <thead><tr><th>ID</th><th>Zona</th><th>Estado</th></tr></thead>
          <tbody>
            {[1,2,3].map(i => (
              <tr key={i}>
                <td><div className="skeleton" style={{height:'1rem', width:'80px'}} /></td>
                <td><div className="skeleton" style={{height:'1rem', width:'60px'}} /></td>
                <td><div className="skeleton" style={{height:'1rem', width:'100px'}} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (pedidos.length === 0) {
    return (
      <div className="empty-state">
        <span>📭</span>
        <p>No hay pedidos que coincidan con los filtros.</p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="pedidos-table">
        <thead>
          <tr>
            <th>ID Pedido</th>
            <th>Zona</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map(p => (
            <tr key={p.id}>
              <td className="id-cell">{p.id}</td>
              <td>{p.zona}</td>
              <td>{estadoBadge(p.estado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
