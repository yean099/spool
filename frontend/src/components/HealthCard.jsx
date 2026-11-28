const estadoColor = (estado) => {
  if (!estado) return 'var(--text-muted)'
  if (estado === 'ok') return 'var(--green)'
  return 'var(--red)'
}

export default function HealthCard({ health, loading }) {
  if (loading && !health) {
    return (
      <div className="health-grid">
        {[1,2,3].map(i => <div key={i} className="health-card skeleton" />)}
      </div>
    )
  }

  const items = health
    ? [
        { label: 'Estado', value: health.estado ?? '—', icon: health.estado === 'ok' ? '✅' : '❌', color: estadoColor(health.estado) },
        { label: 'Instancia', value: health.instancia ?? '—', icon: '🖥️', color: 'var(--accent)' },
        { label: 'Versión datos', value: health.version_datos ?? '—', icon: '🗂️', color: 'var(--accent2)' },
      ]
    : [
        { label: 'Estado', value: 'Sin datos', icon: '⚠️', color: 'var(--red)' },
        { label: 'Instancia', value: '—', icon: '🖥️', color: 'var(--text-muted)' },
        { label: 'Versión datos', value: '—', icon: '🗂️', color: 'var(--text-muted)' },
      ]

  return (
    <div className="health-grid">
      {items.map(item => (
        <div key={item.label} className="health-card">
          <span className="health-icon">{item.icon}</span>
          <div>
            <p className="health-label">{item.label}</p>
            <p className="health-value" style={{ color: item.color }}>{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
