import { test } from 'node:test'
import assert from 'node:assert/strict'
import { siguienteId, validarPedido, cargar, guardar } from './pedidosManuales.js'

const fakeStorage = (inicial) => {
  const m = new Map(inicial ? [['nodoRuta.pedidosManuales', inicial]] : [])
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }
}

test('siguienteId sin pedidos devuelve PED-001', () => {
  assert.equal(siguienteId([]), 'PED-001')
})
test('siguienteId toma el mayor número y suma uno', () => {
  assert.equal(siguienteId(['PED-001', 'PED-009']), 'PED-010')
})
test('siguienteId ignora IDs que no encajan', () => {
  assert.equal(siguienteId(['PED-007', 'legacy-x', 'PED-abc']), 'PED-008')
})
test('validarPedido rechaza ID vacío', () => {
  assert.ok(validarPedido({ id: '  ', zona: 'Norte', estado: 'Pendiente' }, []))
})
test('validarPedido rechaza duplicado sin distinguir mayúsculas ni espacios', () => {
  assert.ok(validarPedido({ id: 'ped-001 ', zona: 'Norte', estado: 'Pendiente' }, ['PED-001']))
})
test('validarPedido acepta pedido válido', () => {
  assert.equal(validarPedido({ id: 'PED-050', zona: 'Norte', estado: 'Pendiente' }, ['PED-001']), null)
})
test('validarPedido rechaza zona o estado vacíos', () => {
  assert.ok(validarPedido({ id: 'PED-050', zona: '', estado: 'Pendiente' }, []))
  assert.ok(validarPedido({ id: 'PED-050', zona: 'Norte', estado: '' }, []))
})
test('cargar con JSON corrupto devuelve lista vacía', () => {
  assert.deepEqual(cargar(fakeStorage('{no es json')), [])
})
test('cargar con valor que no es lista devuelve lista vacía', () => {
  assert.deepEqual(cargar(fakeStorage('{"a":1}')), [])
})
test('cargar sin storage devuelve lista vacía', () => {
  assert.deepEqual(cargar(undefined), [])
})
test('guardar y cargar devuelven la misma lista', () => {
  const s = fakeStorage()
  const lista = [{ id: 'PED-050', zona: 'Norte', estado: 'Pendiente', manual: true }]
  guardar(s, lista)
  assert.deepEqual(cargar(s), lista)
})
test('guardar no lanza si setItem falla', () => {
  assert.doesNotThrow(() => guardar({ setItem() { throw new Error('bloqueado') } }, []))
})
