# Nodo Ruta: pruebas de carga, justificación y solución propuesta

> Caso ficticio (EstudIA). Todas las pruebas se hicieron en **un solo computador** (8 CPU, Docker Desktop) el 2026-11-21. Las cifras sirven para **comparar escenarios entre sí**, no como capacidad de producción. El generador de carga corre en el mismo equipo que el servicio.

## 1. Metodología

- Herramienta: `scripts/prueba_carga.py`, creada por el equipo y basada solo en la biblioteca estándar de Python. Simula *N* usuarios concurrentes que consultan `GET /pedidos` sin pausa durante *X* segundos. Registra peticiones/s, latencia (media, p95, p99), errores, reparto por instancia y una serie por segundo.
- `scripts/verificar_servicio.py` (del paquete) se usó solo para la evidencia secuencial final, porque no es una prueba de carga.
- Para simular la caída de una instancia se usaron dos métodos:
  - **Parada del operador:** `docker compose kill app1`.
  - **Crash real del proceso:** `docker run --rm --privileged --pid=host alpine kill -9 <PID de app1>`.

Ejemplo de comando:
```text
python scripts/prueba_carga.py --usuarios 20 --segundos 20 --salida evidencias/carga_A_2inst_20u.json
```

## 2. Resultados

### 2.1 Una instancia frente a dos (20 usuarios, 20 s)

| Escenario | Peticiones/s | Latencia media | p95 | Errores | Reparto | Evidencia |
|---|---|---|---|---|---|---|
| A: 2 instancias | **381.9** | **52 ms** | 92 ms | 0 % | app1 3825 / app2 3824 | `carga_A_2inst_20u.json` |
| B: 1 instancia | 286.7 | 69 ms | 106 ms | 0 % | app1 5748 | `carga_B_1inst_20u.json` |

NGINX reparte casi al 50 % (round-robin). Con dos instancias se obtiene **~33 % más rendimiento** y **~25 % menos latencia media**.

### 2.2 Curva de escalado (20 s por prueba)

| Usuarios | 1 inst. pet/s | 2 inst. pet/s | 1 inst. latencia media | 2 inst. latencia media | Errores |
|---|---|---|---|---|---|
| 10 | 306.3 | 380.9 | 32.5 ms | 26.2 ms | 0 % |
| 50 | 322.6 | 406.2 | 151.9 ms | 121.1 ms | 0 % |
| 100 | 355.9 | 448.2 | 276.0 ms | 219.1 ms | 0 % |

Evidencias: `carga_E_{1|2}inst_{10|50|100}u.json`.

Lectura:
- Las peticiones/s casi no crecen con más usuarios, mientras que la latencia crece casi en proporción. El sistema está **saturado** ya con 10 a 20 usuarios: los usuarios adicionales hacen cola.
- La segunda instancia da un 20-26 % más de rendimiento, **no el doble**. Las dos comparten el mismo computador, el mismo NGINX y el mismo generador de carga. **Escalar dentro de una sola máquina tiene un techo.**
- No hubo errores ni con 100 usuarios: el servicio se vuelve lento, pero no falla.

### 2.3 Caída de una instancia durante la carga (20 usuarios, 30 s, caída a los 10 s)

| Escenario | Errores vistos por el usuario | ¿app1 vuelve? | Pet/s medias | Peticiones de app1 | Evidencia |
|---|---|---|---|---|---|
| C: sin `restart` (`kill`) | **0 %** | No, queda `Exited (137)` | 289.4 | 1787 | `carga_C_caida_sin_restart.json` |
| D: con `restart: unless-stopped` (crash real) | **0 %** | **Sí**, healthy en ~8 s | **395.3** | 4983 | `carga_D_caida_con_restart.json` |

- En los dos casos el usuario no vio errores. NGINX (`proxy_next_upstream error timeout http_502…`) reintenta en la otra instancia. Es una **detección pasiva**: actúa solo cuando falla una petición.
- Sin la política de reinicio, el servicio sigue funcionando pero con **la capacidad de una sola instancia** (equivale al escenario B) hasta que alguien intervenga a mano.
- Con la política, Docker levanta app1 solo y la capacidad vuelve a la de dos instancias.

### 2.4 Validación de la guía de mejora (`gu_a_de_mejora.md`)

| Prueba | Resultado | RestartCount |
|---|---|---|
| `docker compose kill app1` (paso 4 de la guía) | **No se reinicia**: queda `Exited (137)` | 0 |
| `kill -9` al proceso python (crash real) | **Se reinicia** y queda healthy en ~8 s | 1 |

**Corrección a la guía:** la mejora es correcta, pero **su prueba de validación no lo es**. Docker trata `docker kill` / `compose kill` como una **parada manual**, igual que `stop`, y `unless-stopped` no reinicia contenedores parados a mano. Para validarla hay que provocar un fallo del proceso, como el `kill -9` del PID indicado arriba.

Límite de la mejora: `restart` actúa solo cuando el proceso **termina**. Si la app se cuelga pero el proceso sigue vivo, Docker la marca *unhealthy* y **no la reinicia**.

### 2.5 Validación final sobre el código del equipo (rama `feature003`, commit `270a42b`)

Se revisó el commit `515c32f` de `feature001`, que añade `restart: unless-stopped` solo a app1 y app2. Correcciones aplicadas en `270a42b`:
- `restart: unless-stopped` también en el `proxy`.
- `EXPOSE 8080` en el `Dockerfile` (decía 8081, pero la app escucha en el 8080).
- Se eliminó `cosas/app.py` (copia sin uso de `app.py`).
- Se quitaron los `__pycache__/*.pyc` del repo y se agregó `.gitignore`.

| Prueba | Método | Resultado | RestartCount | `GET /health` |
|---|---|---|---|---|
| 1 | `docker compose kill app1` (paso 4 original de la guía) | `exited (137)`, **no se reinicia** | 0 | 200 (responde app2) |
| 2 | Caída real de app1 (`kill -9` al PID) | **Se reinicia solo** | 1 | 200 |
| 3a | Caída real del proxy **sin** la corrección (`515c32f`, `restart=no`) | `exited (137)`, **el servicio cae completo** | 0 | **000 (sin respuesta)** |
| 3b | Caída real del proxy **con** la corrección (`270a42b`) | **Se reinicia solo** | 1 | 200 |

Evidencia: `validacion_restart.txt`.

| Prueba | Usuarios / duración | Peticiones | Errores | Pet/s | Latencia media / p95 | Reparto | Evidencia |
|---|---|---|---|---|---|---|---|
| 4: carga + caída real de app1 a los 10 s | 20 / 30 s | 12 329 | **0 %** | 410.6 | 48.7 / 81.8 ms | app1 5166 / app2 7163 | `carga_F_caida_app1_270a42b.json` |
| 5: verificación secuencial | 10 consultas | 10 | 0 | n/a | n/a | app1 y app2 | `final_270a42b.json` → **CUMPLE** |

En la prueba 4, el `RestartCount` de app1 pasó de 1 a 2. app1 volvió a recibir tráfico durante la misma prueba y el usuario no vio ningún error.

## 3. Justificación de la arquitectura

**¿Por qué contenedores?**
- La misma imagen (`Dockerfile`) produce instancias idénticas y reproducibles, en el PC o en la nube.
- Cada instancia es un proceso aislado. Python tiene GIL, así que dos procesos aprovechan mejor los núcleos que uno solo (escenarios A y B).
- Los datos quedan fuera de la capa efímera (bind mount de solo lectura). Recrear un contenedor no los borra.
- Escalar consiste en añadir réplicas de la misma imagen, que es el modelo que usan los servicios de nube (ECS, Cloud Run, Kubernetes).

**¿Por qué dos instancias y un proxy?**
- **Rendimiento:** +20-33 % de peticiones/s y −20-25 % de latencia (sección 2.1 y 2.2).
- **Disponibilidad:** ante la caída de una instancia, 0 % de errores para el usuario (sección 2.3).
- **Un solo punto de entrada** (`127.0.0.1:8080`): el usuario no sabe ni necesita saber qué instancia responde, y solo se publica un puerto.

## 4. Problemas que siguen sin resolver (puntos únicos de fallo)

| # | Problema | Evidencia | Consecuencia |
|---|---|---|---|
| 1 | Una instancia caída no vuelve sola | Escenario C | Capacidad reducida hasta que alguien intervenga |
| 2 | Una instancia colgada (*unhealthy*) no se reinicia ni sale del balanceo | Sección 2.4 | NGINX solo la evita cuando fallan peticiones reales |
| 3 | Un solo NGINX | Arquitectura | Si el proxy cae, cae todo el servicio |
| 4 | Un solo computador (host) | Curva 2.2 + guía del reto | Techo de rendimiento; si el PC falla, cae todo |
| 5 | Un solo `data/pedidos.json`, en el mismo disco que los respaldos | Arquitectura | Si se pierde el disco, se pierden los datos y sus respaldos |
| 6 | Sin observación activa ni alertas | Arquitectura | Nadie se entera de una caída si no revisa `ps` o `logs` |

## 5. Solución propuesta

### Fase 1: mejora inmediata en el MVP local (implementada y validada)
- `restart: unless-stopped` en `app1`, `app2` y `proxy` (`ayuda_opcional/compose.yaml`, commit `270a42b`). **Resuelve el problema 1 y reduce el riesgo del 3**: si NGINX se cae, también se reinicia (pruebas 3a y 3b de la sección 2.5).
- Se mantienen el healthcheck y `proxy_next_upstream` (0 % de errores durante las caídas).
- Opcional para el problema 2: un contenedor *autoheal* que reinicie los contenedores *unhealthy*, o pasar a la Fase 2, donde el orquestador lo hace de forma nativa.

### Fase 2: arquitectura objetivo en la nube (diseño, sin contratar recursos)

```text
Usuarios ──► Balanceador gestionado (health check activo a /health)
                 │                     │
          Zona A: réplica app    Zona B: réplica app     ◄── autoescalado 2..N
                 │                     │
                 └──► Almacenamiento gestionado (versionado) ──► respaldo en otra región
                 Logs + métricas + alertas (tasa de error, p95)
```

| Componente | Resuelve | Ejemplos |
|---|---|---|
| Balanceador gestionado con health check activo a `/health` | 2, 3 | AWS ALB, Google Cloud Load Balancing, Azure Load Balancer |
| Orquestador que reinicia y reemplaza réplicas *unhealthy* | 1, 2 | ECS Fargate, Cloud Run, Kubernetes (liveness/readiness) |
| 2 o más réplicas en **zonas de disponibilidad distintas** | 4 | Configuración multi-AZ |
| Autoescalado por CPU o peticiones | 4 (techo de la sección 2.2) | Política por CPU > 60 % o p95 > 200 ms |
| Datos en almacenamiento gestionado con versionado y respaldo en otra región | 5 | S3/GCS con versionado, o una base de datos gestionada |
| Logs centralizados y alertas | 6 | CloudWatch, Cloud Monitoring |

Criterios de éxito propuestos para validar la Fase 2: tasa de error < 1 % y p95 < 200 ms con la carga de la sección 2.2. Al caerse una réplica, recuperación automática en < 60 s y 0 % de errores para el usuario.

## 6. Evidencia final
- `docker compose ps`: app1 y app2 healthy, proxy Up.
- `python scripts/verificar_servicio.py --esperadas app1,app2 --salida evidencias/final.json` → **CUMPLE** (responden las dos instancias).
- Sobre el código final (`270a42b`): `final_270a42b.json` → **CUMPLE**. app1 y app2 healthy, proxy Up, los tres con `restart=unless-stopped`.
