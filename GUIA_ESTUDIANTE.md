# Antes de comenzar

El objetivo es desplegar un servicio de consulta con dos instancias, observar su estado, conservar los datos al recrear contenedores y probar su recuperación. Retomen el plan del primer encuentro y justifiquen las decisiones del equipo. Nodo Ruta es un caso ficticio.

## Dos rutas de trabajo

Ruta principal: diseñen su despliegue con las herramientas autorizadas. Tienen app.py, Dockerfile y datos sintéticos.
Ayuda opcional: ayuda_opcional/compose.yaml y nginx.conf ofrecen una configuración de referencia. Úsenla si necesitan desbloquearse y expliquen cómo funciona. El ejemplo no sustituye las pruebas ni el diseño de su arquitectura en nube.

## Preparación

1. Extraigan todo el ZIP. Abran una terminal en la carpeta que contiene app.py.
2. Comprueben Python 3 y un motor de contenedores disponible. En Windows pueden sustituir python por py si ese es el comando instalado.
3. Para la ayuda opcional, comprueben docker version y docker compose version. Tener el comando instalado no garantiza que el motor esté iniciado.
4. La primera construcción descarga imágenes: preparen conexión y accesos antes de la sesión. No contraten recursos para el ejercicio.
5. Una cuenta de nube debe estar habilitada por el entorno educativo. Si no existe, documenten la demostración local y el diseño pendiente.

## Qué queda a cargo del equipo

Definir la arquitectura, el lugar de los datos y respaldos, los accesos, la observación del servicio y los criterios de éxito. Identificar los puntos únicos de fallo y proponer una mejora. Dos contenedores en un solo computador no prueban tolerancia al fallo de ese computador.

## Distribución orientadora de cuatro horas

10 min: retomar el plan. 100 min: construir. 15 min: pausa. 60 min: probar. 35 min: ajustar. 15 min: documentar. 5 min: cierre. Coordinen los ajustes con su facilitador.



# La aplicación y los datos de trabajo

## Conserven el conjunto original

El archivo pedidos.json de la raíz contiene seis pedidos sintéticos. Preparen una copia en data/pedidos.json; esa es la que usarán el lanzador local y el ejemplo de contenedores.

```text
python scripts/datos.py preparar
```

## Reconozcan el servicio sin contenedores

```text
python scripts/ejecutar_local.py --puerto 8080 --id local-1
```

Mantengan la terminal abierta y consulten:
http://127.0.0.1:8080/ — descripción del servicio.
http://127.0.0.1:8080/health — estado, instancia y versión de los datos.
http://127.0.0.1:8080/pedidos — pedidos y nombre de la instancia que respondió.
Detengan con Ctrl+C antes de iniciar el laboratorio de contenedores, pues ambos usan el puerto 8080.

## Lo que significa cada respuesta

HTTP 200 indica que la consulta pudo leer los datos. /health devuelve 503 si el archivo no existe o no tiene el formato esperado. La consola registra solicitudes y códigos HTTP. Esta aplicación usa el servidor de la biblioteca estándar de Python para el laboratorio; no es una aplicación lista para producción [1].

## Herramienta de evidencia

Desde otra terminal, pueden realizar diez consultas secuenciales y guardar sus resultados. Elijan un nombre nuevo de salida para cada prueba.

```text
python scripts/verificar_servicio.py http://127.0.0.1:8080/pedidos
```

La salida predeterminada es evidencias/prueba.json. No se sobrescribe si ya existe. El script registra fecha, estado HTTP, instancia, versión y tiempo de cada consulta; no es una prueba de carga. Esta ejecución directa sirve para comprender la app, pero todavía no demuestra el despliegue en contenedores.



# Ayuda opcional de despliegue

El ejemplo inicia app1 y app2 detrás de NGINX. Ambas leen data/pedidos.json montado desde el computador, con permiso de solo lectura dentro del contenedor. Los datos persisten fuera de la capa efímera; no se replican en otro equipo. El proxy se publica solo en 127.0.0.1:8080.

## Comandos desde la carpeta del paquete

Preparen primero los datos de la página anterior. Revisen la configuración antes de construir:

```text
docker compose -f ayuda_opcional/compose.yaml config
```

```text
docker compose -f ayuda_opcional/compose.yaml up -d --build
```

```text
docker compose -f ayuda_opcional/compose.yaml ps
```

Esperen a que las aplicaciones estén healthy y el proxy esté iniciado. Abran /health y /pedidos mediante http://127.0.0.1:8080. La condición service_healthy coordina el arranque; no configura por sí sola el balanceo ni la recuperación de una aplicación [2].

## Comprobaciones iniciales

El nombre instancia debe alternar o permitir observar app1 y app2 en varias consultas. Guarden evidencia y comprueben que ambas respuestas leen la versión prevista.

```text
python scripts/verificar_servicio.py --esperadas app1,app2 --salida evidencias/inicio.json
```

## Qué deben explicar del ejemplo

Qué construye Dockerfile; qué conecta Compose; para qué sirve el proxy; dónde se leen los datos; qué comprueba /health; por qué solo se publica un puerto del host. NGINX usa DNS de Docker y resolución dinámica de los nombres de las instancias; la configuración requiere NGINX 1.27.3 o posterior y propone la imagen 1.28-alpine [3, 4].

La configuración de referencia debe probarse en el motor del equipo. Usen los registros si una imagen no descarga o un servicio no inicia. No marquen la prueba como realizada solo por leer el archivo.



# Fallos de instancia y observación

## Una falla controlada

Con ambas instancias funcionando, detengan únicamente app1. No detengan todo el proyecto.

```text
docker compose -f ayuda_opcional/compose.yaml stop app1
```

Vuelvan a consultar /pedidos por el mismo punto de acceso. Debe responder app2. Pueden observar errores breves: registren lo que ocurre, sin ocultarlo. El proxy intenta otra instancia ante errores y ciertos estados HTTP; ese mecanismo es detección pasiva, no un monitor activo de /health [5].

Para conservar otra evidencia, repitan el comando de verificación agregando --salida evidencias/fallo_app1.json y --esperadas app2. Después recuperen app1:

```text
docker compose -f ayuda_opcional/compose.yaml start app1
```

Esperen la recuperación y vuelvan a comprobar que aparecen ambas instancias. Registren el tiempo desde la detención hasta que lograron consultar por app2 y cualquier interrupción observada.

## Recreación y persistencia

```text
docker compose -f ayuda_opcional/compose.yaml up -d --force-recreate app1
```

Comprueben que data/pedidos.json conserva su versión y contenido. El archivo está fuera del contenedor y se monta en modo lectura [6]. Recrear app1 no debe utilizarse como prueba de respaldo: persistir y respaldar son cosas distintas.

## Registros y estado

```text
docker compose -f ayuda_opcional/compose.yaml logs --tail 50
```

Relacionen una consulta con el código HTTP y, en el proxy, con el upstream que la atendió. Docker puede mostrar una instancia unhealthy sin reiniciarla ni retirarla automáticamente de todos los flujos. Expliquen qué mecanismo detecta cada fallo y qué acción lo recupera.



# Respaldo y restauración de datos

## Crear una copia recuperable

```text
python scripts/datos.py respaldar
```

El script crea un JSON y su huella SHA-256 dentro de respaldos. Anoten la ruta, el valor version y los seis pedidos. Para este laboratorio, guardar el respaldo en otra carpeta separa la copia de trabajo; frente al fallo completo del computador seguiría existiendo un punto único de fallo.

## Simular un archivo incorrecto

```text
python scripts/datos.py simular-error
```

Solo se altera data/pedidos.json; el original y los respaldos quedan intactos. Las dos instancias leen ese mismo archivo, por lo que /health y /pedidos deben devolver 503. La segunda instancia no resuelve un fallo compartido de datos: expliquen esa diferencia respecto a detener app1.

## Recuperar y comprobar

Sustituyan ARCHIVO por el nombre real del respaldo. La huella se valida antes de escribir los datos.

```text
python scripts/datos.py restaurar --respaldo respaldos/ARCHIVO.json
```

Comprueben que /health vuelve a responder 200 y que /pedidos contiene la versión y los registros esperados. Midan el tiempo de recuperación. La restauración escribe sobre el archivo montado y puede producir un 503 breve durante la operación; registren la observación.

## Otra prueba de conservación

Si lo desean, modifiquen un estado de pedido y el campo version en la copia de trabajo, creen un nuevo respaldo y recuperen después la copia anterior. Deben demostrar qué punto de recuperación eligieron, no solo que el archivo abre.

## Limpieza al terminar

```text
docker compose -f ayuda_opcional/compose.yaml down
```

El comando detiene y retira los contenedores del ejemplo. Las carpetas data, respaldos y evidencias permanecen en el computador. No utilicen comandos de limpieza global ni borren recursos ajenos al ejercicio.



# Pruebas de entrega y decisiones de nube

## Pruebas mínimas

I01 — Consultar por el acceso común y observar app1 y app2.
I02 — Detener app1 y consultar por app2; registrar errores y tiempo.
I03 — Recuperar app1 y observar nuevamente ambas instancias.
I04 — Recrear una instancia y comprobar que conserva los datos externos.
I05 — Alterar la copia de datos, observar 503, restaurar y comprobar contenido.
I06 — Repetir el despliegue o la recuperación con otro integrante y las instrucciones del equipo.

## Arquitectura que deben presentar

Identifiquen acceso público, proxy, instancias, almacenamiento, respaldo y observación. En el ejemplo local, el computador, el proxy y el archivo compartido siguen siendo puntos únicos de fallo. Propongan qué servicios o separación de componentes utilizarían en nube, cómo administrarían permisos y HTTPS, y qué consumos podrían generar costos. No inventen precios.

## Problemas frecuentes

No conecta al motor: iniciar el motor autorizado o pedir apoyo. Si solo pueden ejecutar Python, documenten esa demostración parcial.
Puerto 8080 ocupado: detener el lanzador local o cambiar el puerto del host en Compose y la URL de prueba.
No inicia el montaje: ejecutar primero datos.py preparar y revisar las rutas.
/health devuelve 503: comprobar que el archivo de trabajo es JSON válido y que existe el montaje.
Solo aparece una instancia: revisar ps, salud y registros; repetir suficientes consultas y comprobar IDs distintos.
La salida de evidencia ya existe: usar --salida con un nombre nuevo.

## Referencias oficiales

[1] https://docs.python.org/3/library/http.server.html
[2] https://docs.docker.com/compose/how-tos/startup-order/
[3] https://docs.docker.com/engine/network/
[4] https://nginx.org/en/docs/http/ngx_http_upstream_module.html
[5] https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_next_upstream
[6] https://docs.docker.com/engine/storage/bind-mounts/
Consultadas el 19 de noviembre de 2026. El archivo REFERENCIAS.md contiene los mismos enlaces.



# Bitácora editable del equipo

Completen esta página en Word o PLANTILLA_EVIDENCIAS.md. Dupliquen la ficha por cada prueba. Conserven los JSON de verificación y las capturas; no incluyan secretos.

## Identificación y arquitectura

Equipo e integrantes: [completar]
Fecha y responsables de despliegue, pruebas y documentación: [completar]
Modalidad — nube, contenedores locales o demostración parcial: [completar]
Punto de acceso e instancias: [completar]
Ubicación de datos y respaldos: [completar]
Ayudas utilizadas y cambios propios: [completar]
Puntos únicos de fallo y mejora propuesta: [completar]

## Ficha de prueba

ID y objetivo: [completar]
Estado inicial, versión de datos e instancias: [completar]
Pasos para repetir: [completar]
Resultado esperado: [completar]
Resultado observado y códigos HTTP: [completar]
Inicio, fin y tiempo de recuperación: [completar]
Ruta de evidencia o captura: [completar]
Estado — cumple, parcial, no cumple o no realizado: [completar]
Ajuste y resultado al repetir: [completar]

## Continuidad

Qué funciona y qué no se pudo verificar: [completar]
Qué falta para un despliegue en nube: [completar]
Mejora priorizada para el encuentro 3: [completar]

