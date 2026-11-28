export const CLAVE = 'nodoRuta.pedidosManuales'

const norm = (id) => String(id ?? '').trim().toUpperCase()

export function siguienteId(idsExistentes) {
  let max = 0
  for (const id of idsExistentes) {
    const m = /^PED-(\d+)$/i.exec(norm(id))
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `PED-${String(max + 1).padStart(3, '0')}`
}

export function validarPedido(pedido, idsExistentes) {
  const id = norm(pedido.id)
  if (!id) return 'El ID es obligatorio.'
  if (idsExistentes.some((x) => norm(x) === id)) return `El ID ${id} ya existe.`
  if (!String(pedido.zona ?? '').trim()) return 'Elige una zona.'
  if (!String(pedido.estado ?? '').trim()) return 'Elige un estado.'
  return null
}

export function cargar(storage) {
  try {
    const lista = JSON.parse(storage?.getItem(CLAVE) ?? '[]')
    if (!Array.isArray(lista)) return []
    return lista
      .filter((p) => p && typeof p.id === 'string' && typeof p.zona === 'string' && typeof p.estado === 'string')
      .map((p) => ({ id: p.id, zona: p.zona, estado: p.estado, manual: true }))
  } catch {
    return []
  }
}

export function guardar(storage, lista) {
  try {
    storage?.setItem(CLAVE, JSON.stringify(lista))
  } catch {
    /* localStorage no disponible: la app sigue sin persistir */
  }
}

export function filtroValido(valor, opciones, porDefecto) {
  return opciones.includes(valor) ? valor : porDefecto
}
