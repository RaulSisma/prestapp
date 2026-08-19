-- ========================================================
-- PRESTAPP - ESQUEMA DE BASE DE DATOS PARA SUPABASE (v4)
-- ========================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    documento VARCHAR(30) NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('ADMIN', 'COBRADOR')) DEFAULT 'COBRADOR',
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA RUTAS
CREATE TABLE IF NOT EXISTS rutas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA CLIENTES (Con soporte para fotos de casa, cliente y documento)
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruta_id UUID REFERENCES rutas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    documento VARCHAR(30),
    telefono VARCHAR(20) NOT NULL,
    direccion TEXT NOT NULL,
    barrio VARCHAR(100) NOT NULL,
    alias VARCHAR(50),
    foto_url TEXT,
    foto_casa TEXT,
    foto_cliente TEXT,
    foto_documento TEXT,
    estado VARCHAR(20) CHECK (estado IN ('ACTIVO', 'INACTIVO')) DEFAULT 'ACTIVO',
    orden_visita INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA PRESTAMOS
CREATE TABLE IF NOT EXISTS prestamos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    monto NUMERIC(12, 2) NOT NULL,
    interes NUMERIC(5, 2) NOT NULL,
    monto_total NUMERIC(12, 2) NOT NULL,
    saldo NUMERIC(12, 2) NOT NULL,
    cuotas_totales INT NOT NULL,
    cuotas_pagadas INT DEFAULT 0,
    valor_cuota NUMERIC(12, 2) NOT NULL,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_pago VARCHAR(20) CHECK (tipo_pago IN ('DIARIO', 'SEMANAL', 'QUINCENAL', 'MENSUAL')) DEFAULT 'DIARIO',
    estado VARCHAR(20) CHECK (estado IN ('PENDIENTE', 'ACTIVO', 'PAGADO', 'EN_MORA')) DEFAULT 'ACTIVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA PAGOS
CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prestamo_id UUID REFERENCES prestamos(id) ON DELETE CASCADE,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valor NUMERIC(12, 2) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('CUOTA_REGULAR', 'ABONO_EXTRA')) DEFAULT 'CUOTA_REGULAR',
    num_cuota INT,
    observaciones TEXT,
    registrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA ABONOS EXTRAORDINARIOS
CREATE TABLE IF NOT EXISTS abonos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prestamo_id UUID REFERENCES prestamos(id) ON DELETE CASCADE,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valor NUMERIC(12, 2) NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÍNDICES PARA ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_rutas_usuario ON rutas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clientes_ruta ON clientes(ruta_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_cliente ON prestamos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_prestamo ON pagos(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_abonos_prestamo ON abonos(prestamo_id);

-- POLÍTICAS RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acceso total a usuarios" ON usuarios;
DROP POLICY IF EXISTS "Permitir acceso total a rutas" ON rutas;
DROP POLICY IF EXISTS "Permitir acceso total a clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir acceso total a prestamos" ON prestamos;
DROP POLICY IF EXISTS "Permitir acceso total a pagos" ON pagos;
DROP POLICY IF EXISTS "Permitir acceso total a abonos" ON abonos;

CREATE POLICY "Permitir acceso total a usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a rutas" ON rutas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a prestamos" ON prestamos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a pagos" ON pagos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso total a abonos" ON abonos FOR ALL USING (true) WITH CHECK (true);
