# 📦 Nodo Ruta

Panel de seguimiento de pedidos logísticos — caso ficticio **EstudIA** · Bootcamp DevOps.

Servicio REST en Python con dos instancias balanceadas por NGINX y un dashboard React que muestra el estado de los pedidos en tiempo real.

---

## Arquitectura

```
http://localhost:8080
        │
   ┌────▼─────┐
   │  NGINX   │  proxy + balanceador + sirve frontend
   └────┬─────┘
        │
   ┌────┴────────────────────┐
   │                         │
┌──▼──┐                   ┌──▼──┐
│app1 │                   │app2 │   Python HTTP (puerto 8080 interno)
└──┬──┘                   └──┬──┘
   └──────────┬──────────────┘
              │ bind-mount (solo lectura)
       data/pedidos.json

┌─────────────┐
│  frontend   │   React + Vite (build estático servido por NGINX)
└─────────────┘
```

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| Docker Desktop | 4.x |
| Docker Compose | v2 (incluido en Docker Desktop) |
| Python | 3.10+ (solo para scripts locales) |
| Node.js | 18+ (solo para desarrollo frontend) |

---

## Ejecución local (desarrollo)

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd spool
```

### 2. Preparar los datos de trabajo

> El script copia `pedidos.json` de la raíz a `data/pedidos.json`,
> que es el archivo que montan los contenedores.

```bash
python scripts/datos.py preparar
```

### 3. Levantar el stack completo

```bash
docker compose up -d --build
```

Espera a que todos los servicios estén `healthy`:

```bash
docker compose ps
```

### 4. Verificar

| Ruta | Descripción |
|---|---|
| `http://localhost:8080` | Dashboard React |
| `http://localhost:8080/health` | Estado del backend (instancia activa) |
| `http://localhost:8080/pedidos` | JSON con todos los pedidos |

### 5. Detener

```bash
docker compose down
```

---

## Guía de producción paso a paso

### Paso 1 — Requisitos de infraestructura

Antes de desplegar necesitas:

- Un servidor o instancia de nube con Docker instalado (ej. AWS EC2, GCP Compute Engine, Azure VM, DigitalOcean Droplet).
- Acceso SSH al servidor.
- Un dominio o IP pública apuntando al servidor.
- Puertos **80** y **443** abiertos en el firewall/security group.

---

### Paso 2 — Preparar el servidor

```bash
# Conectarse por SSH
ssh usuario@IP_DEL_SERVIDOR

# Instalar Docker (Debian/Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker version
docker compose version
```

---

### Paso 3 — Subir el código al servidor

**Opción A — Git (recomendado):**

```bash
git clone <url-del-repo> /opt/nodo-ruta
cd /opt/nodo-ruta
git checkout main   # o la rama que se va a desplegar
```

**Opción B — SCP desde tu máquina local:**

```bash
scp -r . usuario@IP_DEL_SERVIDOR:/opt/nodo-ruta
```

---

### Paso 4 — Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
cd /opt/nodo-ruta
cp .env.example .env   # si existe, si no créalo manualmente
nano .env
```

Variables disponibles:

```env
# Puerto público expuesto por NGINX
PUBLIC_PORT=80

# IDs de las instancias del backend
INSTANCE_ID_1=app1
INSTANCE_ID_2=app2
```

> ⚠️ **Nunca subas `.env` al repositorio.** Está en `.gitignore`.

---

### Paso 5 — Preparar los datos

```bash
cd /opt/nodo-ruta
python3 scripts/datos.py preparar
```

Verifica que el archivo existe y es válido:

```bash
python3 -c "import json; d=json.load(open('data/pedidos.json')); print(f\"{len(d['pedidos'])} pedidos · version {d['version']}\")"
```

---

### Paso 6 — Construir y lanzar en producción

```bash
docker compose up -d --build
```

Verifica que todos los contenedores estén `healthy`:

```bash
docker compose ps
```

Salida esperada:

```
NAME                        STATUS
nodo-ruta-lab-app1-1        Up (healthy)
nodo-ruta-lab-app2-1        Up (healthy)
nodo-ruta-lab-proxy-1       Up
nodo-ruta-lab-frontend-1    Up
```

---

### Paso 7 — Verificar el servicio

```bash
# Health check
curl http://localhost:8080/health

# Pedidos (primeros 3)
curl -s http://localhost:8080/pedidos | python3 -m json.tool | head -30

# Verificar que responden ambas instancias (10 consultas)
python3 scripts/verificar_servicio.py http://localhost:8080/pedidos \
  --esperadas app1,app2 \
  --salida evidencias/produccion_inicio.json
```

---

### Paso 8 — Configurar HTTPS (recomendado en producción)

Instala Certbot para obtener un certificado TLS gratuito de Let's Encrypt:

```bash
sudo apt install certbot -y

# Detener NGINX del contenedor temporalmente
docker compose stop proxy

# Obtener certificado
sudo certbot certonly --standalone -d tudominio.com

# El certificado queda en:
# /etc/letsencrypt/live/tudominio.com/fullchain.pem
# /etc/letsencrypt/live/tudominio.com/privkey.pem
```

Luego actualiza `nginx.conf` para escuchar en 443 y monta los certificados en el `compose.yaml`.

---

### Paso 9 — Configurar reinicio automático

Para que los contenedores se relancen solos si el servidor reinicia, agrega `restart: unless-stopped` a cada servicio en `compose.yaml`:

```yaml
services:
  app1:
    restart: unless-stopped
  app2:
    restart: unless-stopped
  proxy:
    restart: unless-stopped
  frontend:
    restart: unless-stopped
```

Luego aplica el cambio:

```bash
docker compose up -d
```

---

### Paso 10 — Respaldar los datos

Antes de cualquier cambio en producción, crea un respaldo:

```bash
python3 scripts/datos.py respaldar
# El respaldo queda en respaldos/<timestamp>.json con su huella SHA-256
```

Para restaurar si algo sale mal:

```bash
python3 scripts/datos.py restaurar --respaldo respaldos/ARCHIVO.json
```

---

## Pruebas de aceptación (pre-producción)

| ID | Prueba | Criterio de éxito |
|---|---|---|
| I01 | Consultar `/pedidos` y observar `app1` y `app2` en las respuestas | Aparecen ambas instancias |
| I02 | Detener `app1` y consultar — debe responder `app2` | Sin interrupción visible |
| I03 | Recuperar `app1` y verificar ambas instancias | Ambas responden |
| I04 | Recrear `app1` con `--force-recreate` | Datos intactos |
| I05 | Simular error de datos, observar 503, restaurar y verificar | `/health` vuelve a 200 |
| I06 | Repetir despliegue con otro integrante del equipo | Proceso reproducible |

```bash
# I01
python3 scripts/verificar_servicio.py http://localhost:8080/pedidos --esperadas app1,app2

# I02
docker compose stop app1
python3 scripts/verificar_servicio.py http://localhost:8080/pedidos --esperadas app2

# I03
docker compose start app1
python3 scripts/verificar_servicio.py http://localhost:8080/pedidos --esperadas app1,app2

# I04
docker compose up -d --force-recreate app1

# I05
python3 scripts/datos.py simular-error
curl http://localhost:8080/health  # debe devolver 503
python3 scripts/datos.py restaurar --respaldo respaldos/ARCHIVO.json
curl http://localhost:8080/health  # debe volver a 200
```

---

## Estructura del proyecto

```
spool/
├── app.py                  # Backend Python (HTTP server)
├── pedidos.json            # Datos originales (fuente de verdad)
├── Dockerfile              # Imagen del backend
├── compose.yaml            # Stack completo (backend x2 + frontend + proxy)
├── nginx.conf              # Config NGINX: balanceo + proxy frontend
├── data/
│   └── pedidos.json        # Copia de trabajo montada en los contenedores
├── frontend/
│   ├── Dockerfile          # Build multi-stage: Node → NGINX estático
│   ├── nginx-spa.conf      # Config NGINX para React SPA
│   ├── vite.config.js      # Proxy al backend en desarrollo local
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── HealthCard.jsx
│           ├── PedidosTable.jsx
│           └── Filters.jsx
├── scripts/
│   ├── datos.py            # Preparar / respaldar / restaurar datos
│   ├── ejecutar_local.py   # Correr backend sin Docker
│   └── verificar_servicio.py  # Pruebas HTTP automatizadas
├── ayuda_opcional/
│   ├── compose.yaml        # Config de referencia (2 instancias + proxy)
│   └── nginx.conf          # Config de referencia NGINX
└── respaldos/              # Generado por datos.py respaldar
```

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs solo del proxy (observar balanceo)
docker compose logs -f proxy

# Estado de los contenedores
docker compose ps

# Reiniciar una instancia
docker compose restart app1

# Reconstruir solo el frontend
docker compose up -d --build frontend

# Escalar instancias (opcional, requiere ajustar nginx.conf)
docker compose up -d --scale app1=3
```

---

## Solución de problemas comunes

| Error | Causa | Solución |
|---|---|---|
| `failed to mount pedidos.json` | `data/pedidos.json` no existe | Ejecutar `python3 scripts/datos.py preparar` |
| Puerto 8080 ocupado | Otro proceso usa el puerto | Cambiar el puerto en `compose.yaml` y la URL de prueba |
| `/health` devuelve 503 | JSON de datos inválido | Ejecutar `datos.py restaurar` con un respaldo válido |
| Solo responde una instancia | La otra está unhealthy | `docker compose logs app1` para ver el error |
| `dockerDesktopLinuxEngine` no encontrado | Docker Desktop no está corriendo | Iniciar Docker Desktop desde el menú de inicio |

---

## Referencias

- [Python http.server](https://docs.python.org/3/library/http.server.html)
- [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [NGINX upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [NGINX proxy_next_upstream](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_next_upstream)
