# Mejoras aplicadas al MVP - Nodo Ruta

Dos mejoras de resiliencia sobre `ayuda_opcional/compose.yaml` y los scripts base, ambas probadas.

## 1. Autorrecuperación de contenedores

**Problema:** si el proceso de un contenedor se cae, Docker lo deja apagado y alguien debe levantarlo a mano.

**Solución:** `restart: unless-stopped` en `app1`, `app2` y `proxy`. Docker reinicia solo un contenedor que falla, salvo que lo detengas tú.

```yaml
services:
  app1:
    restart: unless-stopped
```

Después de editar el compose hay que recrear los contenedores (los ya creados conservan la política anterior):

```bash
docker compose -f ayuda_opcional/compose.yaml up -d
```

**Cómo probarlo:** `docker kill` y `docker stop` cuentan como apagado manual y Docker no reinicia. Para simular una caída real se mata el proceso desde dentro:

```bash
docker compose -f ayuda_opcional/compose.yaml exec app1 python -c "import os,signal; os.kill(1, signal.SIGINT)"
docker inspect -f '{{.RestartCount}}' nodo-ruta-lab-app1-1
```

**Resultado:** `RestartCount` pasó de 0 a 1 y `app1` volvió a `healthy` sin intervención.

## 2. Respaldo automático de datos

**Problema:** `scripts/datos.py respaldar` se ejecuta a mano. Si nadie lo hace, no hay punto de recuperación reciente.

**Solución:** un script que lo ejecuta y una tarea programada que lo lanza cada hora.

- `auto_backup.sh`: versión Linux / Cloud Shell (se programa con `cron`).
- `auto_backup.bat`: versión Windows. Guarda el resultado en `respaldos/cron.log`.
- Tarea de Windows `NodoRuta-Respaldo`, cada hora:

```bash
schtasks /Create /TN "NodoRuta-Respaldo" /TR "<ruta>\auto_backup.bat" /SC HOURLY /F
```

Cada respaldo genera un `.json` y un `.sha256` para comprobar su integridad.

**Resultado:** la tarea creó respaldos en `respaldos/` y el hash coincide con el archivo.

## Limitaciones conocidas

- Los respaldos están en el mismo disco que los datos: no protegen contra la pérdida del equipo.
- No hay rotación: los respaldos se acumulan.
- La tarea solo corre mientras la sesión de Windows esté abierta.
- Sigue habiendo un único host: dos contenedores en la misma máquina no son alta disponibilidad real.

## Siguiente paso (diseño en la nube)

Balanceador gestionado y Cloud Run en varias zonas, base de datos gestionada, respaldos en almacenamiento externo con versionado, HTTPS e IAM.
