import { useState, useEffect, useCallback } from 'react'
import HealthCard from './components/HealthCard'
import PedidosTable from './components/PedidosTable'
import Filters from './components/Filters'
import PedidoForm from './components/PedidoForm'
import { siguienteId, validarPedido, cargar, guardar, filtroValido } from './lib/pedidosManuales'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

const almacenamiento = () => {
  try { return window.localStorage } catch { return undefined }
}

function App() {
  const [health, setHealth] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [filtroZona, setFiltroZona] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [manuales, setManuales] = useState(() => cargar(almacenamiento()))
  const [mostrarForm, setMostrarForm] = useState(false)

  const actualizarManuales = (nueva) => {
    setManuales(nueva)
    guardar(almacenamiento(), nueva)
  }

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
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  const todos = [...pedidos, ...manuales]
  const idsTodos = todos.map(p => p.id)

  const zonas = ['Todas', ...new Set(todos.map(p => p.zona))]
  const estados = ['Todos', ...new Set(todos.map(p => p.estado))]
  const zonaActiva = filtroValido(filtroZona, zonas, 'Todas')
  const estadoActivo = filtroValido(filtroEstado, estados, 'Todos')

  const pedidosFiltrados = todos.filter(p => {
    const zonaOk = zonaActiva === 'Todas' || p.zona === zonaActiva
    const estadoOk = estadoActivo === 'Todos' || p.estado === estadoActivo
    return zonaOk && estadoOk
  })

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
              filtroZona={zonaActiva}
              filtroEstado={estadoActivo}
              onZonaChange={setFiltroZona}
              onEstadoChange={setFiltroEstado}
            />
            <button className="btn-refresh" onClick={() => setMostrarForm(true)}>+ Registrar pedido</button>
          </div>
          {mostrarForm && (
            <PedidoForm
              key={`${zonas.join('|')}#${estados.join('|')}`}
              zonas={zonas.filter(z => z !== 'Todas')}
              estados={estados.filter(e => e !== 'Todos')}
              idSugerido={siguienteId(idsTodos)}
              validar={(p) => validarPedido(p, idsTodos)}
              onGuardar={(p) => { actualizarManuales([...manuales, { ...p, manual: true }]); setMostrarForm(false) }}
              onCancelar={() => setMostrarForm(false)}
            />
          )}
          <p className="aviso-manual">Los pedidos manuales se guardan solo en este navegador y no se envían al servidor.</p>
          <PedidosTable
            pedidos={pedidosFiltrados}
            loading={loading}
            onQuitar={(id) => actualizarManuales(manuales.filter(m => m.id !== id))}
          />
        </section>
      </main>

      <footer className="app-footer">
        <span>Nodo Ruta · Bootcamp DevOps · Caso ficticio EstudIA</span>
        <span>Auto-refresh cada 3 s</span>
      </footer>
    </div>
  )
}

export default App
