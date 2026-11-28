# Registro manual de pedidos en el frontend (demo) — diseño

## Intención
El frontend es una demo. Se quiere un botón para registrar un pedido a mano y verlo en la tabla, sin tocar el backend.

## Objetivos
- Botón **+ Registrar pedido** junto a los filtros; abre un formulario (ID, zona, estado).
- Los pedidos manuales se guardan en `localStorage` y sobreviven a recargas.
- La tabla mezcla pedidos del servidor y manuales; los manuales llevan etiqueta "manual" y respetan filtros y contador.
- Aviso visible: son pedidos locales de este navegador, no se envían al servidor.

## No objetivos / anti-objetivos
- No cambia `/pedidos`, `datos-v1`, backend, compose ni nginx.
- No persiste en servidor ni se comparte entre navegadores.

## Enfoques considerados
- A. Backend `POST` + archivo compartido: persistente, pero exige quitar el solo lectura del bind mount, bloqueo entre `app1`/`app2` y pruebas. Descartado para una demo.
- B. Solo frontend con `localStorage`: **elegido** (el usuario indicó que el front es una demo). Migrable a A después, porque el formulario no cambia.
- C. Backend con lista en memoria: inconsistente con dos instancias. Descartado.

## Diseño
- ID sugerido: siguiente número libre `PED-NNN` (tomando servidor + manuales). Obligatorio y único.
- Zona y estado: selectores con los valores existentes en los datos.
- Cada pedido manual tiene botón para quitarlo (decisión del asistente, fácil de omitir).
- Componentes: `PedidoForm.jsx` nuevo; cambios en `App.jsx`, `PedidosTable.jsx`, CSS. Hook/utilidad para `localStorage`.

## Pruebas
Compilar el frontend, levantar con Docker y comprobar: guardar, filtrar, rechazar ID repetido, persistir tras recargar, borrar.
