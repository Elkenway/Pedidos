# Castano Living — Estado del proyecto

## Orden para actualizar tu BD existente

1. iniciar o reiniciar el servidor:
```cmd
cd C:\Users\theal\Documents\Universidad\doo2026\castano-living
node server.js
```

## comprobante en PDF

Cada venta ahora se puede imprimir en dos momentos:
- **Al terminar de vender** (pantalla de éxito) — botón "Imprimir comprobante", disponible para quien acaba de vender, sea vendedor o admin.
- **Desde el panel de Ventas** (solo admin) — cada tarjeta tiene su propio botón "Imprimir", por si hay que reimprimir una venta anterior.

El botón abre el PDF en una pestaña nueva del navegador; desde ahí se
imprime con Ctrl+P o se guarda. El PDF incluye datos de entrega,
productos, total y método de pago — sirve como recibo para el cliente
y como orden de entrega para quien reparte el mueble.

**Archivo nuevo:** `lib/pdfPedido.js` — separada la generacion del PDF en
su propio archivo en vez de meterlo todo en `server.js`, para que cada
archivo tenga una sola responsabilidad clara.

**Sección "Ventas" (solo admin).** Muestra cada pedido registrado
— lo haya vendido el vendedor o el propio admin, ambos caen en la misma
lista automáticamente porque ambos quedan guardados en `pedidos` con
quién lo procesó. Cada tarjeta de venta muestra: número de pedido,
fecha, quién la hizo, método de pago, datos de entrega del cliente,
los productos vendidos y el total. Arriba se ve un resumen con el
número total de ventas y el monto acumulado.

## Credenciales
| Usuario   | Contraseña | Rol      |
|-----------|-----------|----------|
| elkenway  | 1459      | admin    |
| argiro    | 1961      | vendedor |

## Rutas API
| Método | Ruta               | Quién     | Descripción                              |
|--------|--------------------| ----------|-------------------------------------------|
| POST   | /api/login         | Todos     | Login, devuelve el rol                    |
| GET    | /api/productos     | Todos     | Lista productos                           |
| POST   | /api/productos     | Admin     | Agrega producto nuevo                     |
| PUT    | /api/productos/:id | Admin     | Modifica nombre/precio/stock/estado       |
| DELETE | /api/productos/:id | Admin     | Elimina producto                          |
| POST   | /api/ventas        | Todos     | Registra la venta (valida y descuenta stock) |
| GET    | /api/ventas        | Admin     | Lista todas las ventas con sus items      |
| GET    | /api/ventas/:id/pdf| Todos     | Genera el comprobante en PDF de un pedido |

## Nota importante sobre seguridad

Ahora mismo cualquiera que conozca las rutas `/api/productos` (POST/PUT/DELETE)
o `/api/ventas` (GET) podría llamarlas directamente sin pasar por el login,
porque el servidor todavía no valida el rol en cada petición — solo el
frontend oculta los botones según el rol. Para una versión que se vaya a
usar con datos reales de la empresa, esto hay que cerrarlo (sesiones o
tokens). Por ahora, para la entrega académica y las pruebas internas, no
es bloqueante.

## Pendiente
- Pedidos personalizados / encargos por Instagram
- Asociar sillas específicas a cada mesa
- Validar rol del usuario en el servidor (ver nota de seguridad arriba)
