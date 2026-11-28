# Registro manual de pedidos (demo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un botón **+ Registrar pedido** en el dashboard que guarda pedidos manuales en `localStorage` y los muestra en la tabla junto a los del servidor.

**Architecture:** Lógica pura (ID sugerido, validación, carga/guardado) en un módulo JS sin dependencias de React ni del navegador, probado con `node --test`. La UI (formulario, etiqueta "manual", borrado) es una capa fina en React sobre ese módulo. El backend, compose y nginx no cambian.

**Tech Stack:** React 19, Vite 8, oxlint, `node --test` (integrado en Node 18+, sin dependencias nuevas).

**Spec:** `docs/superpowers/specs/2026-11-28-registro-pedido-manual-design.md`

## Global Constraints

- Frontend solo: no tocar `app.py`, `compose.yaml`, `nginx.conf` ni `data/pedidos.json`.
- Clave de `localStorage`: `nodoRuta.pedidosManuales`.
- Formato de pedido manual: `{ id: string, zona: string, estado: string, manual: true }`.
- ID sugerido con formato `PED-NNN` (3 dígitos mínimo), siguiente número libre considerando servidor + manuales.
- ID obligatorio y único (sin distinguir mayúsculas ni espacios en los extremos).
- Zona y estado: selectores con los valores existentes en los datos.
- Aviso visible: pedidos locales de este navegador, no se envían al servidor.
- Textos de la interfaz en español.

## Review Focus

- ID repetido con otra capitalización o espacios (`ped-001 `): se rechaza como duplicado.
- `localStorage` con JSON corrupto o con un valor que no es lista: se ignora y se parte de lista vacía, sin romper la página.
- `localStorage` no disponible (modo privado o bloqueado): la app sigue funcionando sin persistir y no lanza error.
- IDs del servidor que no siguen el formato `PED-NNN`: el ID sugerido ignora los que no encajan y no produce `NaN`.
- Un pedido del servidor aparece más tarde con el mismo ID que uno manual (por ejemplo tras una `datos-v2`): las filas siguen mostrándose sin colisión de clave.

---

### Task 1: Lógica de pedidos manuales

**Files:**
- Create: `frontend/src/lib/pedidosManuales.js`
- Test: `frontend/src/lib/pedidosManuales.test.js`
- Modify: `frontend/package.json` (script `"test": "node --test src/lib"`)

**Interfaces:**
- Produces:
  - `export const CLAVE = 'nodoRuta.pedidosManuales'`
  - `export function siguienteId(idsExistentes: string[]): string`
  - `export function validarPedido(pedido: {id: string, zona: string, estado: string}, idsExistentes: string[]): string | null` (devuelve el mensaje de error en español, o `null` si es válido)
  - `export function cargar(storage: Storage | undefined): Array<{id, zona, estado, manual: true}>`
  - `export function guardar(storage: Storage | undefined, lista: Array): void`

- [ ] **Step 1: Escribir las pruebas que fallan** en `pedidosManuales.test.js` (con `node:test` y `node:assert/strict`). Nombres y aserciones:
  - `siguienteId([])` → `'PED-001'`
  - `siguienteId(['PED-001','PED-009'])` → `'PED-010'`
  - `siguienteId(['PED-007','legacy-x','PED-abc'])` → `'PED-008'` (ignora los que no encajan)
  - `validarPedido({id:'  ',zona:'Norte',estado:'Pendiente'}, [])` → mensaje no nulo (ID obligatorio)
  - `validarPedido({id:'ped-001 ',zona:'Norte',estado:'Pendiente'}, ['PED-001'])` → mensaje no nulo (duplicado sin distinguir mayúsculas ni espacios)
  - `validarPedido({id:'PED-050',zona:'Norte',estado:'Pendiente'}, ['PED-001'])` → `null`
  - `validarPedido` con zona o estado vacíos → mensaje no nulo
  - `cargar` con un storage falso cuyo valor es `'{no es json'` → `[]`
  - `cargar` con valor `'{"a":1}'` (no es lista) → `[]`
  - `cargar(undefined)` → `[]`
  - `guardar(storage, lista)` y luego `cargar(storage)` devuelve la misma lista
  - `guardar` con un storage cuyo `setItem` lanza → no lanza
  - Storage falso: objeto `{ getItem, setItem }` sobre un `Map`, definido en el propio test.

- [ ] **Step 2: Ejecutar y comprobar que falla**
  Run: `cd frontend && npm test`
  Expected: FAIL (módulo no encontrado).

- [ ] **Step 3: Implementar el módulo** con las firmas de Interfaces. `siguienteId` toma el mayor número de los IDs que cumplen `/^PED-(\d+)$/i`, suma 1 y rellena a 3 dígitos. `cargar` y `guardar` envuelven el acceso a `storage` en `try/catch`; `cargar` valida que lo leído sea una lista y marca cada elemento con `manual: true`.

- [ ] **Step 4: Ejecutar y comprobar que pasa**
  Run: `cd frontend && npm test`
  Expected: PASS, todas las pruebas en verde.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/lib frontend/package.json
  git commit -m "feat(frontend): lógica de pedidos manuales con pruebas"
  ```

### Task 2: Formulario, tabla y aviso en el dashboard

**Files:**
- Create: `frontend/src/components/PedidoForm.jsx`
- Modify: `frontend/src/App.jsx`, `frontend/src/components/PedidosTable.jsx`, `frontend/src/App.css`

**Interfaces:**
- Consumes: `siguienteId`, `validarPedido`, `cargar`, `guardar` de `src/lib/pedidosManuales.js` (Task 1).
- Produces:
  - `PedidoForm({ zonas: string[], estados: string[], idSugerido: string, validar: (p) => string | null, onGuardar: (p) => void, onCancelar: () => void })`: formulario controlado con ID, zona y estado; muestra el error devuelto por `validar` y no llama a `onGuardar` si hay error.
  - `PedidosTable` acepta una prop opcional `onQuitar: (id: string) => void`; las filas con `manual: true` muestran la etiqueta **manual** y un botón de quitar. La clave de fila pasa a `` `${p.manual ? 'm' : 's'}-${p.id}` ``.

- [ ] **Step 1: Crear `PedidoForm.jsx`** con la firma de Interfaces. Los selectores de zona y estado excluyen las opciones `'Todas'` y `'Todos'`; el ID empieza con `idSugerido`.

- [ ] **Step 2: Integrar en `App.jsx`**
  - Estado `manuales` inicializado con `cargar(window.localStorage)` (protegido contra acceso bloqueado) y persistido con `guardar` en cada cambio.
  - `todos = [...pedidos, ...manuales]` alimenta filtros, contador, `zonas` y `estados` en lugar de `pedidos`.
  - Botón **+ Registrar pedido** junto a `Filters` que abre `PedidoForm`; al guardar, añade `{...p, manual: true}` y cierra.
  - `validar` usa `validarPedido` con los IDs de `todos`. `idSugerido` usa `siguienteId` con esos mismos IDs.
  - Aviso en la sección Pedidos: "Los pedidos manuales se guardan solo en este navegador y no se envían al servidor."
  - Quitar un pedido manual lo elimina de `manuales`.

- [ ] **Step 3: Actualizar `PedidosTable.jsx` y `App.css`** según Interfaces, con estilos para el botón, el formulario (reutilizando variables CSS existentes), la etiqueta **manual** y el aviso.

- [ ] **Step 4: Verificar compilación y lint**
  Run: `cd frontend && npm run lint && npm run build && npm test`
  Expected: lint sin errores, build termina bien, pruebas en verde.

- [ ] **Step 5: Verificar en el navegador con Docker**
  Run: `docker compose up -d --build frontend` desde la raíz del repo y abrir `http://localhost:8080`.
  Expected, comprobado a mano:
  - El formulario propone `PED-010` (con los 9 pedidos actuales de `datos-v1`; si el conteo difiere, el siguiente libre).
  - Guardar muestra el pedido con la etiqueta **manual** y el contador sube en 1.
  - Un ID repetido (incluso `ped-001`) muestra error y no guarda.
  - Los filtros y el contador incluyen el pedido manual.
  - Recargar la página conserva el pedido; quitarlo lo elimina.
  - `curl http://127.0.0.1:8080/pedidos` no cambia (sin el pedido manual).

- [ ] **Step 6: Commit**
  ```bash
  git add frontend docs
  git commit -m "feat(frontend): botón para registrar pedido manual (demo, localStorage)"
  ```
