-- ============================================
--  CASTANO LIVING | arreglos.sql
--  Ejecutar UNA VEZ en pgAdmin sobre tu BD
--  castano_living ya existente (no la borra,
--  no le quita datos validos).
-- ============================================

-- 1) Eliminar filas duplicadas, quedandose con el id mas antiguo
DELETE FROM productos a
USING productos b
WHERE a.id > b.id AND a.nombre = b.nombre;

DELETE FROM pagos_tarjeta_credito a
USING pagos_tarjeta_credito b
WHERE a.id > b.id AND a.numero_tarjeta = b.numero_tarjeta;

DELETE FROM usuarios a
USING usuarios b
WHERE a.id > b.id AND a.nombre_usuario = b.nombre_usuario;

-- 2) Agregar restricciones UNIQUE para que los duplicados
--    NUNCA vuelvan a ocurrir, ni siquiera si se reejecuta un
--    script de inserts por accidente (el "ON CONFLICT DO NOTHING"
--    solo funciona si existe una restriccion UNIQUE que revisar,
--    y hasta ahora "productos" y "tarjetas" no tenian ninguna).
DO $$ BEGIN
  ALTER TABLE productos ADD CONSTRAINT productos_nombre_key UNIQUE (nombre);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pagos_tarjeta_credito ADD CONSTRAINT tarjeta_numero_key UNIQUE (numero_tarjeta);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- 3) Verificacion final: deberian verse numeros razonables,
--    sin miles de filas repetidas
SELECT 'productos' AS tabla, COUNT(*) AS total FROM productos
UNION ALL
SELECT 'tarjetas',           COUNT(*)          FROM pagos_tarjeta_credito
UNION ALL
SELECT 'usuarios',           COUNT(*)          FROM usuarios;
