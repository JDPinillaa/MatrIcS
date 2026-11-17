--Sistema de Parqueadero Automatizado - Datos semilla
--Tarea TT-02

\getenv seed_admin_password SEED_ADMIN_PASSWORD
\getenv seed_operador_password SEED_OPERADOR_PASSWORD

BEGIN; 
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO roles (nombre) VALUES
    ('ADMINISTRADOR'),
    ('OPERADOR');


INSERT INTO tipos_vehiculo (codigo) VALUES
    ('CARRO'),
    ('MOTO');


--Sede principal

INSERT INTO sedes (nombre, umbral_confianza) VALUES
    ('Sede Principal', 80.00);

--Franjas horarias

INSERT INTO franjas_horarias(sede_id, nombre, hora_inicio, hora_fin)
SELECT s.id, f.nombre, f.hora_inicio, f.hora_fin
FROM sedes AS s
CROSS JOIN (VALUES
    ('DIURNA', TIME '06:00', TIME '17:59'),
    ('NOCTURNA', TIME '18:00', TIME '05:59')
) AS f (nombre, hora_inicio, hora_fin)
WHERE s.nombre = 'Sede Principal';

--Tarifas por franja

INSERT INTO tarifas (franja_id, tipo_vehiculo_id, valor)
SELECT fh.id, tv.id, t.valor
FROM (VALUES
    ('DIURNA', 'CARRO', 4000.00),
    ('NOCTURNA', 'CARRO', 2500.00),
    ('DIURNA', 'MOTO', 0.00),
    ('NOCTURNA', 'MOTO', 0.00)
) AS t (franja, tipo, valor)
JOIN sedes AS s  ON s.nombre = 'Sede Principal'
JOIN franjas_horarias AS fh ON fh.sede_id = s.id AND fh.nombre = t.franja
JOIN tipos_vehiculo   AS tv ON tv.codigo = t.tipo;

--Cupos por tipo de vehiculo
INSERT INTO cupos (sede_id, tipo_vehiculo_id, capacidad_maxima)
SELECT s.id, tv.id, c.capacidad
FROM (VALUES
    ('CARRO', 50),
    ('MOTO',  30)
) AS c (tipo, capacidad)
JOIN tipos_vehiculo AS tv ON tv.codigo = c.tipo
CROSS JOIN sedes AS s
WHERE s.nombre = 'Sede Principal';


--Usuarios Iniciales
INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash)
SELECT r.id, u.nombre, u.email, crypt(u.clave, gen_salt('bf', 10))
FROM (VALUES
    ('ADMINISTRADOR', 'Administrador del Sistema',   'admin@parqueadero.local', :'seed_admin_password'),
    ('OPERADOR',      'Operador de Carril y Caja',   'operador@parqueadero.local', :'seed_operador_password')
) AS u (rol, nombre, email, clave)
JOIN roles AS r ON r.nombre = u.rol;

COMMIT;










