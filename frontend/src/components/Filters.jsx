export default function Filters({ zonas, estados, filtroZona, filtroEstado, onZonaChange, onEstadoChange }) {
  return (
    <div className="filters">
      <label className="filter-group">
        <span>Zona</span>
        <select value={filtroZona} onChange={e => onZonaChange(e.target.value)}>
          {zonas.map(z => <option key={z}>{z}</option>)}
        </select>
      </label>
      <label className="filter-group">
        <span>Estado</span>
        <select value={filtroEstado} onChange={e => onEstadoChange(e.target.value)}>
          {estados.map(e => <option key={e}>{e}</option>)}
        </select>
      </label>
    </div>
  )
}
