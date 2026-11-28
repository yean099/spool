# Manual de usuario — Nodo Ruta

Nodo Ruta es un panel web para consultar el estado de los pedidos de la empresa y comprobar que el servicio funciona. (Caso ficticio EstudIA.)

No necesitas instalar nada: solo un navegador. Pide a quien administra el servicio la dirección de acceso; en una instalación local es:

**http://localhost:8080**

---

## 1. Qué verás en pantalla

### Encabezado
- Título **Nodo Ruta**.
- **Última actualización:** la hora en que se cargaron los datos por última vez.
- Botón **Actualizar**: vuelve a consultar los datos al momento.

### Estado del servicio
Tres tarjetas:

| Tarjeta | Qué significa |
|---|---|
| **Estado** | ✅ `ok` si todo funciona; ❌ si hay un problema |
| **Instancia** | Qué copia del servicio te respondió (`app1` o `app2`). Puede cambiar entre una consulta y otra: es normal |
| **Versión datos** | Versión del conjunto de pedidos que se está mostrando (por ejemplo `datos-v1`) |

### Tabla de pedidos
Lista cada pedido con su identificador (por ejemplo `PED-001`), su **zona** y su **estado**. El número junto al título **Pedidos** indica cuántos se muestran con los filtros actuales.

Los pedidos que registres tú a mano aparecen con la etiqueta **manual** junto al identificador (ver "Registrar un pedido manual").

## 2. Cómo usar el panel

### Filtrar pedidos
Arriba de la tabla hay dos filtros:
- **Zona:** Norte, Centro, Sur, Occidente, Oriente (según existan en los datos).
- **Estado:** por ejemplo *Pendiente*, *En preparación*, *En ruta*, *Entregado*.

Puedes combinar ambos. Para ver todo otra vez, elige **Todas** y **Todos**.

### Registrar un pedido manual
Sirve para añadir un pedido de prueba desde el propio panel.

1. Pulsa **+ Registrar pedido** (junto a los filtros). Se abre el formulario **Nuevo pedido**.
2. Revisa el **ID**: el panel propone el siguiente libre (por ejemplo `PED-007`). Puedes cambiarlo; se guarda en mayúsculas.
3. Elige la **zona** y el **estado** en las listas.
4. Pulsa **Guardar**. El pedido aparece en la tabla con la etiqueta **manual**, y los filtros y el contador lo tienen en cuenta.

Para quitar un pedido manual, pulsa la **✕** que aparece junto a su estado. Los pedidos del servidor no tienen ✕ y no se pueden quitar.

**Importante:** los pedidos manuales se guardan **solo en este navegador**. No se envían al servidor, así que otras personas no los ven, no aparecen en `/pedidos` y no cambian la versión de datos. Si borras los datos del navegador, se pierden.

### Actualización
La página se actualiza sola **cada 3 segundos**. No hace falta recargarla. Si quieres datos al instante, pulsa **Actualizar**.

### Estados de un pedido
| Estado | Significado |
|---|---|
| Pendiente | Aún no se ha empezado a prepararlo |
| En preparación | Se está preparando |
| En ruta | Va camino al destino |
| Entregado | Ya se entregó |

## 3. Consultas directas (opcional)

Si necesitas los datos en bruto, abre estas direcciones en el navegador:

| Dirección | Qué muestra |
|---|---|
| `http://localhost:8080/health` | Si el servicio está bien, qué instancia responde y la versión de datos |
| `http://localhost:8080/pedidos` | Todos los pedidos en formato JSON |

## 4. Qué hacer si algo falla

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| Aviso rojo: *"el servicio puede estar caído"* | El panel no logra contactar el servicio | Espera unos segundos y pulsa **Actualizar**. Si sigue, avisa a soporte técnico |
| Tarjeta **Estado** en ❌ o "Sin datos" | El servicio responde con error o no responde | Avisa a soporte técnico e indica la hora que aparece en "Última actualización" |
| La página no abre | El servicio está apagado o la dirección es incorrecta | Confirma la dirección con quien administra el servicio |
| La **Instancia** cambia entre `app1` y `app2` | Funcionamiento normal: hay dos copias que se reparten el trabajo | Nada |
| La tabla está vacía | Los filtros no coinciden con ningún pedido | Elige **Todas** y **Todos** |
| Al guardar sale *"El ID … ya existe."* | Ya hay un pedido con ese ID (no importan mayúsculas ni espacios) | Cambia el ID o usa el propuesto |
| Al guardar sale *"El ID es obligatorio."* | Dejaste el ID vacío | Escribe un ID, por ejemplo `PED-020` |
| En el formulario no hay zonas ni estados para elegir | El panel aún no ha cargado los datos del servicio | Espera a que carguen los pedidos (hasta 3 s) o pulsa **Actualizar**; si no cargan, avisa a soporte |
| Un pedido manual desapareció | Se borraron los datos del navegador, o estás en otro navegador u otra ventana de incógnito | Vuelve a registrarlo; no se guarda en el servidor |

Al reportar un problema, ayuda a soporte que indiques: la hora, qué mensaje viste y el valor de **Estado** e **Instancia**.

## 5. Preguntas frecuentes

**¿Puedo modificar un pedido desde el panel?**
No se pueden modificar los pedidos del servicio. Solo puedes añadir pedidos manuales de prueba, que quedan guardados en tu navegador, y quitar los que tú añadiste.

**¿Otras personas ven los pedidos que registro?**
No. Se guardan solo en tu navegador y no se envían al servidor.

**¿Los datos son reales?**
No. Es un caso de práctica con datos ficticios.

**¿Por qué dice que hay dos instancias?**
El servicio funciona con dos copias para que, si una falla, la otra siga atendiendo sin que lo notes.

**¿Puedo entrar desde mi celular o desde otra computadora?**
En una instalación local, la dirección `localhost:8080` solo funciona en el mismo equipo donde está instalado. Para acceder desde fuera, el administrador debe habilitarlo (ver el Manual técnico).
