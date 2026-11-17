--Sistema de parqueadero automatizado por lectura de placas
--Tarea: TT-02

BEGIN;

CREATE FUNCTION fn_dia_operativo(p_instante TIMESTAMPTZ)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
   SELECT ((p_instante AT TIME ZONE 'America/Bogota') - INTERVAL '6 hours')::DATE;
$$;

--Seguridad
CREATE TABLE roles (
    id SMALLINT GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(20) NOT NULL, 
    CONSTRAINT pk_roles PRIMARY KEY (id),
    CONSTRAINT uq_roles_nombre UNIQUE(nombre)
);

CREATE TABLE usuarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    rol_id SMALLINT NOT NULL, 
    nombre_completo VARCHAR(100) NOT NULL, 
    email VARCHAR(120) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_usuarios PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_email UNIQUE(email), 
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles (id), 
    CONSTRAINT ck_usuarios_email_minuscula CHECK (email = lower(email))
    --Lower para que el correo se guarde en minuscula
);

--Configuración 

CREATE TABLE sedes (
    id BIGINT GENERATED ALWAYS AS IDENTITY, 
    nombre VARCHAR(100) NOT NULL, 
    umbral_confianza NUMERIC(5,2) NOT NULL DEFAULT 80.00,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_sedes PRIMARY KEY (id),
    CONSTRAINT uq_sedes_nombre UNIQUE (nombre),
    CONSTRAINT ck_sedes_umbral CHECK (umbral_confianza BETWEEN 0 AND 100)
);


CREATE TABLE tipos_vehiculo(
    id SMALLINT GENERATED ALWAYS AS IDENTITY, 
    codigo VARCHAR(20) NOT NULL, 
    CONSTRAINT pk_tipos_vehiculo PRIMARY KEY (id),
    CONSTRAINT uq_tipos_vehiculo_codigo UNIQUE (codigo)
);



CREATE TABLE franjas_horarias (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    sede_id BIGINT NOT NULL, 
    nombre VARCHAR(20) NOT NULL, 
    hora_inicio TIME NOT NULL, 
    hora_fin TIME NOT NULL, 
    CONSTRAINT pk_franjas_horarias PRIMARY KEY (id),
    CONSTRAINT uq_franjas_sede_nombre UNIQUE (sede_id, nombre),
    CONSTRAINT fk_franjas_sede FOREIGN KEY (sede_id) REFERENCES sedes(id),
    CONSTRAINT ck_franjas_horas_distintas CHECK (hora_inicio <> hora_fin)
);

CREATE TABLE tarifas(
    id BIGINT GENERATED ALWAYS AS IDENTITY, 
    franja_id BIGINT NOT NULL, 
    tipo_vehiculo_id SMALLINT NOT NULL, 
    valor NUMERIC(12,2) NOT NULL,
    CONSTRAINT pk_tarifas PRIMARY KEY (id),
    CONSTRAINT uq_tarifas_franja_tipo  UNIQUE (franja_id, tipo_vehiculo_id),
    CONSTRAINT fk_tarifas_franja FOREIGN KEY (franja_id) REFERENCES franjas_horarias (id),
    CONSTRAINT fk_tarifas_tipo FOREIGN KEY (tipo_vehiculo_id) REFERENCES tipos_vehiculo (id),
    CONSTRAINT ck_tarifas_valor CHECK (valor >= 0)
);

--Operación, se aplica el formato de la placa colombiana

CREATE TABLE eventos_acceso(
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    sede_id BIGINT NOT NULL, 
    tipo_vehiculo_id SMALLINT NOT NULL,
    usuario_id BIGINT,                     
    placa VARCHAR(6) NOT NULL,
    tipo_evento VARCHAR(10) NOT NULL,
    confianza_lectura NUMERIC(5,2) NOT NULL,
    lectura_manual BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    resultado_barrera VARCHAR(10)  NOT NULL,
    motivo VARCHAR(200),              
    CONSTRAINT pk_eventos_acceso PRIMARY KEY (id),
    CONSTRAINT fk_eventos_sede FOREIGN KEY (sede_id) REFERENCES sedes (id),
    CONSTRAINT fk_eventos_tipo FOREIGN KEY (tipo_vehiculo_id) REFERENCES tipos_vehiculo (id),
    CONSTRAINT fk_eventos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT ck_eventos_placa_formato CHECK (placa ~ '^[A-Z]{3}[0-9]{2}[0-9A-Z]$'),
    CONSTRAINT ck_eventos_tipo_evento CHECK (tipo_evento IN ('ENTRADA', 'SALIDA')),
    CONSTRAINT ck_eventos_confianza CHECK (confianza_lectura BETWEEN 0 AND 100),
    CONSTRAINT ck_eventos_barrera CHECK (resultado_barrera IN ('ABIERTA', 'CERRADA', 'LLENO')),
    -- Una lectura manual siempre debe dejar registrado al operador.
    CONSTRAINT ck_eventos_manual_con_usuario CHECK (NOT lectura_manual OR usuario_id IS NOT NULL)
);

CREATE TABLE cobros (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    sede_id BIGINT NOT NULL,
    tipo_vehiculo_id SMALLINT NOT NULL,
    evento_ingreso_id BIGINT NOT NULL,
    placa VARCHAR(6) NOT NULL,
    fecha_dia_operativo DATE NOT NULL DEFAULT fn_dia_operativo(now()),
    franja_aplicada VARCHAR(20) NOT NULL,
    valor_aplicado NUMERIC(12,2) NOT NULL,
    estado VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE',
    generado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_cobros PRIMARY KEY (id),
    CONSTRAINT fk_cobros_sede FOREIGN KEY (sede_id) REFERENCES sedes (id),
    CONSTRAINT fk_cobros_tipo FOREIGN KEY (tipo_vehiculo_id) REFERENCES tipos_vehiculo (id),
    CONSTRAINT fk_cobros_evento_ingreso FOREIGN KEY (evento_ingreso_id) REFERENCES eventos_acceso (id),
    CONSTRAINT uq_cobros_placa_sede_dia UNIQUE (placa, sede_id, fecha_dia_operativo),
    -- Cada evento de ingreso genera como máximo un cobro.
    CONSTRAINT uq_cobros_evento_ingreso UNIQUE (evento_ingreso_id),
    CONSTRAINT ck_cobros_placa_formato  CHECK (placa ~ '^[A-Z]{3}[0-9]{2}[0-9A-Z]$'),
    CONSTRAINT ck_cobros_valor          CHECK (valor_aplicado >= 0),
    CONSTRAINT ck_cobros_estado         CHECK (estado IN ('PENDIENTE', 'PAGADO', 'EXENTO', 'ANULADO')),
    -- Un cobro exento no tiene valor a pagar.
    CONSTRAINT ck_cobros_exento_sin_valor CHECK (estado <> 'EXENTO' OR valor_aplicado = 0)
);

CREATE TABLE pagos (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    cobro_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    metodo VARCHAR(15) NOT NULL,
    llave_idempotencia VARCHAR(80)   NOT NULL,
    pagado_en          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT pk_pagos                    PRIMARY KEY (id),
    CONSTRAINT uq_pagos_cobro              UNIQUE (cobro_id),
    CONSTRAINT uq_pagos_llave_idempotencia UNIQUE (llave_idempotencia),
    CONSTRAINT fk_pagos_cobro              FOREIGN KEY (cobro_id) REFERENCES cobros (id),
    CONSTRAINT fk_pagos_usuario            FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT ck_pagos_monto              CHECK (monto > 0),
    -- Por ahora solo efectivo (MVP). Se amplía al integrar la pasarela.
    CONSTRAINT ck_pagos_metodo             CHECK (metodo IN ('EFECTIVO'))
);

CREATE TABLE cupos (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    sede_id BIGINT NOT NULL,
    tipo_vehiculo_id SMALLINT NOT NULL,
    capacidad_maxima INTEGER NOT NULL,
    ocupados INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT pk_cupos PRIMARY KEY (id),
    CONSTRAINT uq_cupos_sede_tipo UNIQUE (sede_id, tipo_vehiculo_id),
    CONSTRAINT fk_cupos_sede FOREIGN KEY (sede_id) REFERENCES sedes (id),
    CONSTRAINT fk_cupos_tipo FOREIGN KEY (tipo_vehiculo_id) REFERENCES tipos_vehiculo (id),
    CONSTRAINT ck_cupos_capacidad CHECK (capacidad_maxima >= 0),
    CONSTRAINT ck_cupos_ocupados CHECK (ocupados BETWEEN 0 AND capacidad_maxima)
);



--Indices para PK y UNIQUE

CREATE INDEX idx_usuarios_rol_id ON usuarios (rol_id);
CREATE INDEX idx_eventos_placa_fecha ON eventos_acceso (placa, fecha_hora DESC);
CREATE INDEX idx_cobros_dia_estado ON cobros (fecha_dia_operativo, estado);
CREATE INDEX idx_pagos_usuario_id ON pagos (usuario_id);

COMMIT;



 











