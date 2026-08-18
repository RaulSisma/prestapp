-- ========================================================
-- PRESTAPP - ESQUEMA DE BASE DE DATOS PARA SUPABASE (v3)
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

-- 3. TABLA CLIENTES (Con 3 fotos: casa, cliente, documento)
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

-- POLÍTICAS RLS (Row Level Security) - Permitir lectura y escritura con la ANON KEY
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso anonimo total a usuarios" ON usuarios FOR ALL USING (true);
CREATE POLICY "Permitir acceso anonimo total a rutas" ON rutas FOR ALL USING (true);
CREATE POLICY "Permitir acceso anonimo total a clientes" ON clientes FOR ALL USING (true);
CREATE POLICY "Permitir acceso anonimo total a prestamos" ON prestamos FOR ALL USING (true);
CREATE POLICY "Permitir acceso anonimo total a pagos" ON pagos FOR ALL USING (true);
CREATE POLICY "Permitir acceso anonimo total a abonos" ON abonos FOR ALL USING (true);

-- DATOS SEMILLA
INSERT INTO usuarios (id, nombre, correo, documento, password, rol, telefono) VALUES
('11111111-1111-1111-1111-111111111111', 'Administrador Principal', 'admin@prestapp.com', '1098234567', '1098234567', 'ADMIN', '3001234567'),
('22222222-2222-2222-2222-222222222222', 'Carlos Cobrador (Norte)', 'carlos@prestapp.com', '80123456', '80123456', 'COBRADOR', '3109876543'),
('33333333-3333-3333-3333-333333333333', 'Andrés Cobrador (Centro)', 'andres@prestapp.com', '91234567', '91234567', 'COBRADOR', '3205554433')
ON CONFLICT (correo) DO NOTHING;

INSERT INTO rutas (id, nombre, usuario_id, descripcion) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ruta Norte', '22222222-2222-2222-2222-222222222222', 'Barrios del sector Norte y Comercial'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ruta Centro', '33333333-3333-3333-3333-333333333333', 'Zona Centro y Mercado Central')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clientes (id, ruta_id, nombre, documento, telefono, direccion, barrio, alias, estado, orden_visita) VALUES
('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Juan Pérez', '1098234567', '3151112233', 'Calle 10 # 15-20', 'La Esperanza', 'Juancho', 'ACTIVO', 1),
('c2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'María Rodríguez', '52890123', '3184445566', 'Carrera 7 # 12-40', 'Los Alpes', 'Doña María', 'ACTIVO', 2),
('c3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Pedro Gómez', '80123456', '3127778899', 'Av. Bolivar # 4-15', 'Centro', 'Don Pedro', 'ACTIVO', 1),
('c4444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ana Martínez', '39789012', '3009990011', 'Calle 5 # 8-30', 'El Carmen', 'ACTIVO', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO prestamos (id, cliente_id, monto, interes, monto_total, saldo, cuotas_totales, cuotas_pagadas, valor_cuota, fecha_inicio, tipo_pago, estado) VALUES
('p1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 500000, 20, 600000, 480000, 30, 6, 20000, CURRENT_DATE - INTERVAL '10 days', 'DIARIO', 'ACTIVO'),
('p2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 300000, 20, 360000, 360000, 30, 0, 12000, CURRENT_DATE - INTERVAL '2 days', 'DIARIO', 'ACTIVO'),
('p3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 1000000, 20, 1200000, 1000000, 24, 4, 50000, CURRENT_DATE - INTERVAL '15 days', 'DIARIO', 'EN_MORA'),
('p4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333', 400000, 20, 480000, 320000, 24, 8, 20000, CURRENT_DATE - INTERVAL '20 days', 'DIARIO', 'ACTIVO')
ON CONFLICT (id) DO NOTHING;
