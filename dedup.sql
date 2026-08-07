-- ============================================
--  CASTANO LIVING | dedup.sql
--  Elimina filas duplicadas de cada tabla
--  Mantiene siempre el registro con menor id
--  Ejecutar en pgAdmin sobre castano_living
-- ============================================

-- Duplicados en productos
DELETE FROM productos a
USING productos b
WHERE a.id > b.id AND a.nombre = b.nombre;

-- Duplicados en tarjetas
DELETE FROM pagos_tarjeta_credito a
USING pagos_tarjeta_credito b
WHERE a.id > b.id AND a.numero_tarjeta = b.numero_tarjeta;

-- Duplicados en usuarios
DELETE FROM usuarios a
USING usuarios b
WHERE a.id > b.id AND a.nombre_usuario = b.nombre_usuario;

-- Verificar que quedó limpio
SELECT 'productos'             AS tabla, COUNT(*) AS total FROM productos
UNION ALL
SELECT 'tarjetas',                       COUNT(*)          FROM pagos_tarjeta_credito
UNION ALL
SELECT 'usuarios',                       COUNT(*)          FROM usuarios;
