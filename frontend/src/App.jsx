import { useState, useEffect, useCallback } from 'react'
import HealthCard from './components/HealthCard'
import PedidosTable from './components/PedidosTable'
import Filters from './components/Filters'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

function App() {
  const [health, setHealth] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [filtroZona, setFiltroZona] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [healthRes, pedidosRes] = await Promise.all([
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/pedidos`),
      ])
      if (!healthRes.ok || !pedidosRes.ok) throw new Error('Error al contactar el servicio')
      const healthData = await healthRes.json()
      const pedidosData = await pedidosRes.json()
      setHealth(healthData)
      setPedidos(pedidosData.pedidos || [])
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  const pedidosFiltrados = pedidos.filter(p => {
    const zonaOk = filtroZona === 'Todas' || p.zona === filtroZona
    const estadoOk = filtroEstado === 'Todos' || p.estado === filtroEstado
    return zonaOk && estadoOk
  })

  const zonas = ['Todas', ...new Set(pedidos.map(p => p.zona))]
  const estados = ['Todos', ...new Set(pedidos.map(p => p.estado))]

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <span className="header-icon">📦</span>
            <div>
              <h1>Nodo Ruta</h1>
              <p>Panel de seguimiento de pedidos</p>
            </div>
          </div>
          <div className="header-actions">
            {lastUpdate && <span className="last-update">Última actualización: {lastUpdate}</span>}
            <button className="btn-refresh" onClick={fetchData} disabled={loading}>
              {loading ? '⟳ Actualizando…' : '⟳ Actualizar'}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="alert alert-error">
            ⚠️ {error} — el servicio puede estar caído.
          </div>
        )}

        <section className="section-health">
          <h2>Estado del servicio</h2>
          <HealthCard health={health} loading={loading} />
        </section>

        <section className="section-pedidos">
          <div className="section-header">
            <h2>Pedidos <span className="badge">{pedidosFiltrados.length}</span></h2>
            <Filters
              zonas={zonas}
              estados={estados}
              filtroZona={filtroZona}
              filtroEstado={filtroEstado}
              onZonaChange={setFiltroZona}
              onEstadoChange={setFiltroEstado}
            />
          </div>
          <PedidosTable pedidos={pedidosFiltrados} loading={loading} />
        </section>
      </main>

      <footer className="app-footer">
        <span>Nodo Ruta · Bootcamp DevOps · Caso ficticio EstudIA</span>
        <span>Auto-refresh cada 10 s</span>
      </footer>
    </div>
  )
}

export default App
