-- ============================================
--  CASTANO LIVING | metodo_pago.sql
--  Ejecutar en pgAdmin sobre tu BD existente
--  (despues de arreglos.sql y pedidos.sql)
-- ============================================

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(100);

-- Opcional: la tabla de tarjetas de prueba ya no se usa en el sistema
-- (el pago ahora se hace por fuera, con datafono o efectivo).
-- Si quieres eliminarla, ejecuta:
-- DROP TABLE pagos_tarjeta_credito;
