# Referencias oficiales
Consultadas el 19 de noviembre de 2026. Verifique la documentación de su versión.

- Servidor HTTP de Python, solo para laboratorio: https://docs.python.org/3/library/http.server.html
- Orden de inicio y salud en Compose: https://docs.docker.com/compose/how-tos/startup-order/
- Montajes de archivos y permisos de lectura: https://docs.docker.com/engine/storage/bind-mounts/
- DNS de contenedores: https://docs.docker.com/engine/network/
- Resolución de servidores upstream en NGINX: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Reintentos del proxy: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_next_upstream

El healthcheck de Compose sirve para comprobar salud y coordinar el arranque.
Por sí solo no configura el balanceo ni retira automáticamente un servidor de NGINX.
El ejemplo usa reintentos y detección pasiva de fallos en el proxy.
