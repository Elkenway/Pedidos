CREATE TABLE IF NOT EXISTS usuarios (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    nombre_usuario VARCHAR(50)  NOT NULL UNIQUE,
    contrasena     VARCHAR(100) NOT NULL,
    creado_en      TIMESTAMP DEFAULT NOW()
);

INSERT INTO usuarios (nombre, nombre_usuario, contrasena) VALUES
('Administrador', 'elkenway', '1459'),
('Argiro',        'argiro',   '1961')
ON CONFLICT (nombre_usuario) DO NOTHING;


-- ── Tabla: productos ─────────────────────────
CREATE TABLE IF NOT EXISTS productos (
    id         SERIAL PRIMARY KEY,
    nombre     VARCHAR(100)  NOT NULL,
    precio     NUMERIC(10,2) NOT NULL,
    disponible BOOLEAN       DEFAULT TRUE,
    cantidad   INTEGER       DEFAULT 0
);

INSERT INTO productos (nombre, precio, disponible, cantidad) VALUES
-- Sillas (10)
('Silla Venecia',        180.00, TRUE, 10),
('Silla Roma',           210.00, TRUE, 10),
('Silla Toscana',        195.00, TRUE, 10),
('Silla Florencia',      225.00, TRUE, 10),
('Silla Milán',          240.00, TRUE, 10),
('Silla Barcelona',      200.00, TRUE, 10),
('Silla Valencia',       185.00, TRUE, 10),
('Silla Sevilla',        215.00, TRUE, 10),
('Silla Córdoba',        190.00, TRUE, 10),
('Silla Granada',        205.00, TRUE, 10),

-- Comedores (10)
('Comedor 4 puestos Roble',      1200.00, TRUE, 10),
('Comedor 6 puestos Cedro',      1550.00, TRUE, 10),
('Comedor 8 puestos Nogal',      1900.00, TRUE, 10),
('Comedor 4 puestos Pino',       1100.00, TRUE, 10),
('Comedor 6 puestos Caoba',      1650.00, TRUE, 10),
('Comedor 8 puestos Teka',       2100.00, TRUE, 10),
('Comedor 4 puestos Wengué',     1350.00, TRUE, 10),
('Comedor 6 puestos Bambú',      1450.00, TRUE, 10),
('Comedor 8 puestos Merbau',     2250.00, TRUE, 10),
('Comedor 10 puestos Cerezo',    2800.00, TRUE, 10),

-- Mesas (10)
('Mesa de trabajo Roble',        450.00, TRUE, 10),
('Mesa auxiliar Nogal',          280.00, TRUE, 10),
('Mesa esquinera Pino',          320.00, TRUE, 10),
('Mesa lateral Cedro',           260.00, TRUE, 10),
('Mesa consola Wengué',          490.00, TRUE, 10),
('Mesa de jardín Teka',          680.00, TRUE, 10),
('Mesa plegable Bambú',          310.00, TRUE, 10),
('Mesa alta bar Roble',          520.00, TRUE, 10),
('Mesa redonda Caoba',           600.00, TRUE, 10),
('Mesa rectangular Merbau',      570.00, TRUE, 10),

-- Mesas de centro (10)
('Mesa de centro Venecia',       350.00, TRUE, 10),
('Mesa de centro Oslo',          420.00, TRUE, 10),
('Mesa de centro Tokio',         390.00, TRUE, 10),
('Mesa de centro París',         480.00, TRUE, 10),
('Mesa de centro Berlín',        410.00, TRUE, 10),
('Mesa de centro Estocolmo',     460.00, TRUE, 10),
('Mesa de centro Ámsterdam',     375.00, TRUE, 10),
('Mesa de centro Lisboa',        440.00, TRUE, 10),
('Mesa de centro Viena',         395.00, TRUE, 10),
('Mesa de centro Praga',         365.00, TRUE, 10)
ON CONFLICT DO NOTHING;


-- ── Tabla: pagos_tarjeta_credito ─────────────
CREATE TABLE IF NOT EXISTS pagos_tarjeta_credito (
    id                  SERIAL PRIMARY KEY,
    nombre_titular      VARCHAR(100) NOT NULL,
    numero_tarjeta      VARCHAR(16)  NOT NULL,
    fecha_vencimiento   VARCHAR(5)   NOT NULL,
    codigo_seguridad    VARCHAR(3)   NOT NULL,
    cantidad_disponible NUMERIC(12,2) DEFAULT 0
);

INSERT INTO pagos_tarjeta_credito (nombre_titular, numero_tarjeta, fecha_vencimiento, codigo_seguridad, cantidad_disponible) VALUES
('Elkenway Castano',  '4532015112830366', '09/28', '472', 50000.00),
('Argiro Castano',    '5425233430109903', '11/27', '815', 30000.00),
('Carlos Mendoza',    '4916338506082832', '03/27', '263', 15000.00),
('Laura Jiménez',     '4539578763621486', '07/26', '934', 25000.00),
('Sin fondos',        '4111111111111111', '06/27', '123',    50.00)
ON CONFLICT DO NOTHING;