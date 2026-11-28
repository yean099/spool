# Manual técnico — Nodo Ruta

Caso ficticio EstudIA (Bootcamp DevOps). Este manual está dirigido a quien despliega, opera y mantiene el servicio.

> **Alcance de lo verificado.** Se comprobó que `docker compose up -d --build` levanta los 4 servicios, que `app1` y `app2` quedan `healthy` y que `/health` y `/pedidos` responden 200 por el proxy. El resto de procedimientos de este manual se deriva de la lectura del código y de la documentación del repositorio, y no se volvió a ejecutar al escribirlo.

---

## 1. Arquitectura

```
Navegador / curl
      │  http://127.0.0.1:8080   (solo el equipo local)
┌─────▼─────┐
│  proxy    │  nginx:1.28-alpine — balanceo round-robin + reparto de rutas
└─┬───────┬─┘
  │       │ /health, /pedidos            todo lo demás
  │       └──────────────┐                    │
┌─▼──┐  ┌────┐           │             ┌──────▼───────┐
│app1│  │app2│ ◄─────────┘             │  frontend    │ React (build estático en nginx)
└─┬──┘  └─┬──┘                          └──────────────┘
  └───┬───┘  bind mount solo lectura
  data/pedidos.json
```

| Servicio | Imagen / build | Puerto | Función |
|---|---|---|---|
| `app1`, `app2` | `Dockerfile` raíz (`python:3-slim`) | 8080 interno | API HTTP en Python (biblioteca estándar) |
| `proxy` | `nginx:1.28-alpine` | `127.0.0.1:8080 → 80` | Único punto de entrada |
| `frontend` | `frontend/Dockerfile` (Node 22 → nginx 1.28) | 80 interno | Dashboard React |

## 2. Componentes

### 2.1 Backend (`app.py`)

Servidor `ThreadingHTTPServer` sin dependencias externas. Lee `DATA_PATH` **en cada petición**, de modo que un cambio en el archivo se refleja sin reiniciar.

| Ruta | Respuesta | Código |
|---|---|---|
| `/` | `{servicio, instancia, rutas}` | 200 |
| `/health` | `{estado: "ok", instancia, version_datos}` | 200 |
| `/pedidos` | `{instancia, version, pedidos[]}` | 200 |
| otra | `{error, instancia}` | 404 |
| datos ilegibles o sin lista `pedidos` | `{estado: "error_datos", instancia}` | 503 |

Variables de entorno:

| Variable | Defecto | Uso |
|---|---|---|
| `DATA_PATH` | `pedidos.json` | Ruta del archivo de datos (en compose: `/data/pedidos.json`) |
| `INSTANCE_ID` | `instancia-ejemplo` | Nombre devuelto en cada respuesta (`app1`, `app2`) |
| `PORT` | `8080` | Puerto de escucha |

El contenedor corre con usuario sin privilegios (`USER 10001`). La imagen incluye una copia de `pedidos.json` como respaldo, pero en compose se sustituye por el bind mount.

### 2.2 Proxy (`nginx.conf`)

- **Upstream `aplicaciones`:** `app1:8080` y `app2:8080` con `resolve` (DNS interno de Docker, `valid=5s`), `max_fails=1`, `fail_timeout=5s`.
- **`/health` y `/pedidos`** → backend. `proxy_connect_timeout 1s`, `proxy_read_timeout 3s`. `proxy_next_upstream` ante error, timeout, 502, 503 y 504, con 2 intentos: si una instancia falla, la petición se reintenta en la otra sin que el cliente lo note.
- **`/api/`** → raíz del backend (`/`). Es la única forma de ver `/` del backend, porque `/` en el proxy lo atiende el frontend.
- **Todo lo demás** → `frontend:80`.
- Añade `Access-Control-Allow-Origin: *` en la API (pensado para desarrollo local).
- Registro con formato `laboratorio`: muestra `upstream=` y `upstream_status=`, útil para ver el reparto.

### 2.3 Frontend (`frontend/`)

React + Vite. Consulta `/health` y `/pedidos` al cargar y cada 3 s (`setInterval` en `src/App.jsx`). `VITE_API_URL` (opcional, en tiempo de build) cambia la base de las llamadas; vacío usa el mismo origen. En desarrollo (`npm run dev`, puerto 3000) Vite redirige `/health` y `/pedidos` a `http://localhost:8080`.

| Archivo | Función |
|---|---|
| `src/App.jsx` | Estado, refresco, filtros e integración del registro manual |
| `src/components/HealthCard.jsx`, `Filters.jsx`, `PedidosTable.jsx` | Tarjetas de estado, filtros y tabla |
| `src/components/PedidoForm.jsx` | Formulario de nuevo pedido (ID, zona, estado) |
| `src/lib/pedidosManuales.js` | Lógica pura: `siguienteId`, `validarPedido`, `cargar`, `guardar`, `filtroValido` |
| `src/lib/pedidosManuales.test.js` | Pruebas con `node --test` |

**Registro manual de pedidos (demo).** El botón **+ Registrar pedido** guarda en `localStorage`, clave `nodoRuta.pedidosManuales`, objetos `{id, zona, estado, manual: true}`. Es una función solo de frontend:

- No llama al backend: `/pedidos` y `version_datos` no cambian, y otros navegadores no ven esos pedidos.
- La tabla une los pedidos del servidor con los manuales (etiqueta "manual", botón ✕ para quitar). La clave de fila es `m-<id>` / `s-<id>`, por lo que un ID repetido entre servidor y manual no colisiona.
- ID sugerido: el siguiente `PED-NNN` libre; los IDs del servidor con otro formato se ignoran. Validación: ID obligatorio y único sin distinguir mayúsculas ni espacios; el formulario lo guarda en mayúsculas.
- `localStorage` corrupto, con un valor que no es lista, o no disponible: se ignora y la app sigue sin persistir.
- Si un filtro apunta a una zona o estado que ya no existe, vuelve a "Todas"/"Todos" (`filtroValido`).
- Limitaciones conocidas: con el servidor sin responder desde el inicio y sin pedidos, no hay zonas ni estados que elegir; dos pestañas abiertas a la vez se pisan al guardar; no se descartan duplicados escritos a mano en el almacenamiento.
- Para persistirlos en servidor haría falta un endpoint de escritura en `app.py`, quitar el solo lectura del bind mount y controlar la escritura concurrente entre `app1` y `app2`. Diseño y alternativas: `docs/superpowers/specs/2026-11-28-registro-pedido-manual-design.md`.

Pruebas y calidad del frontend:

```bash
cd frontend
npm ci
npm test         # node --test "src/lib/*.test.js" (requiere Node 21+)
npm run lint
npm run build
```

### 2.4 Datos

- `pedidos.json` (raíz): fuente original.
- `data/pedidos.json`: copia de trabajo que montan los contenedores (solo lectura).
- Formato obligatorio: objeto JSON con `version` (no vacía) y `pedidos` (lista) de `{id, zona, estado}`.

## 3. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Docker + Compose v2 | Docker Desktop 4.x o equivalente | Despliegue |
| Python | 3.10+ | Scripts de `scripts/` |
| Node.js | 18+ | Solo desarrollo del frontend |

## 4. Despliegue

```bash
git clone <url-del-repo> && cd spool
python scripts/datos.py preparar        # crea data/pedidos.json (falla si ya existe)
docker compose up -d --build
docker compose ps                       # app1 y app2 deben estar (healthy)
curl http://127.0.0.1:8080/health
```

Si `data/pedidos.json` no existe, el montaje falla (`create_host_path: false`). La política de reinicio es `restart: unless-stopped` en los cuatro servicios.

Para detener: `docker compose down`.

### Notas de configuración

- **No se usa ningún `.env`.** Puerto e identificadores están en `compose.yaml`.
- **El puerto publicado es solo local** (`127.0.0.1:8080:80`). Para exponer el servicio hay que cambiar ese mapeo y configurar HTTPS en `nginx.conf` (no implementado).
- Los cuatro servicios tienen `restart: unless-stopped`.

## 5. Operación

### 5.1 Logs y estado

```bash
docker compose ps
docker compose logs -f proxy            # ver reparto entre app1 y app2
docker compose logs -f app1
```

### 5.2 Comprobar el balanceo

```bash
python scripts/verificar_servicio.py http://127.0.0.1:8080/pedidos \
  --esperadas app1,app2 --salida evidencias/mi_prueba.json
```

Hace consultas secuenciales (1 a 100, por defecto 10) y devuelve código 0 si todas dan 200 y las instancias vistas coinciden con `--esperadas`. **No sobrescribe**: si la salida existe, aborta.

### 5.3 Prueba de carga

```bash
python scripts/prueba_carga.py --usuarios 20 --segundos 20 --salida evidencias/carga_nueva.json
```

Simula N usuarios concurrentes (1 a 500) con hilos; informa peticiones/s, latencia media/p95/p99, errores y reparto por instancia. Tampoco sobrescribe salidas. Las cifras sirven para comparar escenarios en un mismo equipo, no como capacidad de producción (`evidencias/INFORME_CARGA_Y_MEJORA.md`: ~382 pet/s con 2 instancias frente a ~287 con 1, a 20 usuarios).

### 5.4 Actualizar el código

```bash
git pull
docker compose up -d --build            # solo recrea lo que cambió
docker compose up -d --build frontend   # solo el frontend
```

### 5.5 Reiniciar o recrear una instancia

```bash
docker compose restart app1
docker compose up -d --force-recreate app1
```

Un contenedor ya creado conserva la política de reinicio con la que nació: tras editar `restart:` hay que recrearlo con `docker compose up -d`.

## 6. Respaldo y restauración

`scripts/datos.py` acepta cuatro acciones:

| Acción | Efecto |
|---|---|
| `preparar` | Copia `pedidos.json` → `data/pedidos.json` (no sobrescribe) |
| `respaldar` | Valida y copia a `respaldos/<fecha>.json` + `.sha256` |
| `simular-error` | Corrompe `data/pedidos.json` a propósito (provoca 503) |
| `restaurar --respaldo respaldos/X.json` | Verifica el SHA-256 y sobrescribe `data/pedidos.json` |

**Respaldo automático:** `auto_backup.sh` (Linux, para `cron`) y `auto_backup.bat` (Windows; registra en `respaldos/cron.log`). Programación en Windows:

```bash
schtasks /Create /TN "NodoRuta-Respaldo" /TR "<ruta>\auto_backup.bat" /SC HOURLY /F
```

Limitaciones: los respaldos están en el mismo disco, no hay rotación y la tarea solo corre con la sesión de Windows abierta.

Durante `restaurar` puede haber un 503 breve, porque se escribe sobre el mismo archivo montado.

## 7. Autorrecuperación y alta disponibilidad

- Si una instancia falla, el proxy reintenta en la otra (`proxy_next_upstream`) y la saca de rotación 5 s tras el primer fallo.
- `restart: unless-stopped` relanza un proceso que cae.
- **`docker kill` y `docker stop` cuentan como parada manual y Docker no reinicia.** Para simular una caída real hay que matar el proceso por dentro; `MEJORAS_APLICADAS.md` documenta esta forma:

```bash
docker compose exec app1 python -c "import os,signal; os.kill(1, signal.SIGINT)"
docker inspect -f '{{.RestartCount}}' nodo-ruta-lab-app1-1
```

- Un único host con dos contenedores **no es alta disponibilidad real**: si cae la máquina, cae todo.

## 8. Pruebas de aceptación

| ID | Prueba | Criterio |
|---|---|---|
| I01 | Consultar `/pedidos` varias veces | Aparecen `app1` y `app2` |
| I02 | `docker compose stop app1` y consultar | Responde `app2` sin interrupción |
| I03 | `docker compose start app1` | Responden ambas |
| I04 | `docker compose up -d --force-recreate app1` | Datos intactos |
| I05 | `datos.py simular-error` → 503 → `restaurar` | `/health` vuelve a 200 |

Comandos completos en el `README.md`, sección "Pruebas de aceptación".

## 9. Solución de problemas

| Síntoma | Causa probable | Acción |
|---|---|---|
| `failed to mount pedidos.json` | Falta `data/pedidos.json` | `python scripts/datos.py preparar` |
| Puerto 8080 ocupado | Otro proceso lo usa | Cambiar el mapeo en `compose.yaml` |
| El formulario de pedido no ofrece zonas ni estados | El frontend aún no recibió `/pedidos` | Comprobar `docker compose ps` y `curl /pedidos`; se rellena solo cuando llegan los datos |
| `/health` → 503 | JSON de datos inválido o ausente | `datos.py restaurar --respaldo …` |
| Responde solo una instancia | La otra está `unhealthy` | `docker compose logs app1` |
| Proxy no arranca por host `frontend` | El contenedor `frontend` no existe aún | `docker compose up -d` (crea todos antes de arrancar el proxy) |
| `dockerDesktopLinuxEngine` no encontrado | Docker Desktop apagado | Iniciarlo |
| `restaurar` rechaza el respaldo | El `.sha256` no coincide o falta | Usar un respaldo creado por `datos.py respaldar` |

## 10. Estructura del repositorio

```
app.py, Dockerfile, compose.yaml, nginx.conf, pedidos.json
data/pedidos.json             copia de trabajo (montada)
frontend/                     React + Vite (Dockerfile, nginx-spa.conf, src/)
scripts/                      datos.py, ejecutar_local.py, verificar_servicio.py, prueba_carga.py
evidencias/                   resultados de pruebas de carga y recuperación
respaldos/                    generado por datos.py respaldar (no versionado)
ayuda_opcional/               compose y nginx de referencia
auto_backup.sh / .bat         respaldo programable
docs/                         este manual y el manual de usuario
docs/superpowers/             diseño y plan del registro manual de pedidos
```

Ejecución local sin Docker: `python scripts/ejecutar_local.py --puerto 8080 --id local-1` (usa `data/pedidos.json`).
