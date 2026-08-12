-- ============================================
--  CASTANO LIVING | pedidos.sql
--  Script de referencia para instalar desde cero.
--  Si ya tienes estas tablas, no lo reejecutes:
--  usa metodo_pago.sql para agregar las columnas nuevas.
-- ============================================

CREATE SEQUENCE IF NOT EXISTS pedidos_numero_seq START WITH 1000 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS pedidos (
  id                  SERIAL PRIMARY KEY,
  numero_pedido       INTEGER NOT NULL DEFAULT nextval('pedidos_numero_seq') UNIQUE,
  usuario_id          INTEGER,
  nombre_destinatario VARCHAR(100) NOT NULL,
  direccion           VARCHAR(200) NOT NULL,
  ciudad              VARCHAR(100) NOT NULL,
  telefono            VARCHAR(20)  NOT NULL,
  notas               TEXT,
  metodo_pago         VARCHAR(30)  NOT NULL DEFAULT 'efectivo',
  referencia_pago     VARCHAR(100),
  total               NUMERIC(10,2) NOT NULL,
  fecha_pedido        TIMESTAMP DEFAULT NOW(),
  estado              VARCHAR(30) DEFAULT 'pendiente'
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id               SERIAL PRIMARY KEY,
  pedido_id        INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id      INTEGER,
  nombre_producto  VARCHAR(100) NOT NULL,
  precio_unitario  NUMERIC(10,2) NOT NULL,
  cantidad         INTEGER NOT NULL
);

-- Cuando la fabrica confirme el numero de pedido inicial:
-- ALTER SEQUENCE pedidos_numero_seq RESTART WITH 5000;
