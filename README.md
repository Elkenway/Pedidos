# Castano Living — Estado del proyecto (hoy)

## Arrancar el proyecto
```cmd
cd C:\Users\theal\Documents\Universidad\doo2026\castano-living
node server.js
```
Abrir en: http://localhost:3000

## Credenciales
| Usuario   | Contraseña |
|-----------|-----------|
| elkenway  | 1459      |
| argiro    | 1961      |

## Tarjetas de prueba
| Titular          | Número               | Exp   | CVV | Saldo    |
|------------------|----------------------|-------|-----|----------|
| Elkenway Castano | 4532 0151 1283 0366  | 09/28 | 472 | $50.000  |
| Argiro Castano   | 5425 2334 3010 9903  | 11/27 | 815 | $30.000  |
| Carlos Mendoza   | 4916 3385 0608 2832  | 03/27 | 263 | $15.000  |
| Laura Jiménez    | 4539 5787 6362 1486  | 07/26 | 934 | $25.000  |
| Sin fondos       | 4111 1111 1111 1111  | 06/27 | 123 | $50      |

## Estructura
```
castano-living/
├── server.js              ← Node.js + Express + rutas API
├── package.json
├── castano_living.sql     ← Tablas + datos de prueba
├── README.md
└── public/
    ├── index.html         ← SPA: Login / Tienda / Pago / Éxito
    ├── css/
    │   └── main.css
    └── js/
        └── app.js
```

## Rutas API disponibles
| Método | Ruta           | Descripción                        |
|--------|----------------|------------------------------------|
| POST   | /api/login     | Autenticación de usuario           |
| GET    | /api/productos | Lista productos desde la BD        |
| GET    | /api/tarjetas  | Lista tarjetas de prueba desde BD  |
| POST   | /api/pago      | Procesa el pago y descuenta saldo  |

## Lo que viene (pendiente)
- Barra de búsqueda
- Productos iguales se suman en el carrito
- Pedidos personalizados
- Impresión de recibo (PDF)
- Stock se descuenta al pagar
- Manejo de excepciones robusto
- Logs de actividad
- Transacciones SQL con ROLLBACK
- Mappers / Adapters / Patrón MVC
- Clases con constructores, getters y setters
- ESLint (análisis estático)
- Git con ramas (main / develop / feature-x)
- Sistema de pagos real (Wompi / PayU)
- Comunicación almacén ↔ bodega (WebSockets)
- Subir a la nube (Railway / Render)
