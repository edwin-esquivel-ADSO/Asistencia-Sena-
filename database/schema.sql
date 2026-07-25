-- Database Schema for SENA Attendance Management System (PostgreSQL)

-- Drop tables if they exist
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS qr_sessions CASCADE;
DROP TABLE IF EXISTS instructor_fichas CASCADE;
DROP TABLE IF EXISTS ambientes CASCADE;
DROP TABLE IF EXISTS fichas CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table (Instructores y Coordinadores)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    document VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('instructor', 'coordinador')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index on document for faster login
CREATE INDEX idx_users_document ON users(document);

-- 2. Fichas Table (Programas de Formación)
CREATE TABLE fichas (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    program_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ambientes Table
CREATE TABLE ambientes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Instructor Fichas Relation Table (Fichas asignadas a instructores)
CREATE TABLE instructor_fichas (
    instructor_id INT REFERENCES users(id) ON DELETE CASCADE,
    ficha_id INT REFERENCES fichas(id) ON DELETE CASCADE,
    PRIMARY KEY (instructor_id, ficha_id)
);

-- 5. QR Sessions Table (Sesiones activas creadas por instructores)
CREATE TABLE qr_sessions (
    id SERIAL PRIMARY KEY,
    token VARCHAR(100) UNIQUE NOT NULL,
    instructor_id INT REFERENCES users(id) ON DELETE CASCADE,
    ficha_id INT REFERENCES fichas(id) ON DELETE CASCADE,
    jornada VARCHAR(50) NOT NULL CHECK (jornada IN ('Diurna', 'Tarde', 'Nocturna', 'Mixta')),
    ambiente_id INT REFERENCES ambientes(id) ON DELETE CASCADE,
    duration_minutes INT NOT NULL DEFAULT 15,
    hours_duration INT NOT NULL DEFAULT 6,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for qr_sessions
CREATE INDEX idx_qr_sessions_token ON qr_sessions(token);
CREATE INDEX idx_qr_sessions_status ON qr_sessions(status);

-- 6. Attendances Table
CREATE TABLE attendances (
    id SERIAL PRIMARY KEY,
    qr_session_id INT REFERENCES qr_sessions(id) ON DELETE SET NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    instructor_name VARCHAR(150) NOT NULL,
    ficha_code VARCHAR(50) NOT NULL,
    jornada VARCHAR(50) NOT NULL,
    ambiente_name VARCHAR(100) NOT NULL,
    aprendiz_name VARCHAR(150) NOT NULL,
    aprendiz_document VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Presente' CHECK (estado IN ('Presente', 'Falta', 'Tarde', 'Justificado')),
    horas INT NOT NULL DEFAULT 0,
    ip_publica VARCHAR(45) NOT NULL,
    latitud VARCHAR(50) DEFAULT 'Ubicación no disponible',
    longitud VARCHAR(50) DEFAULT 'Ubicación no disponible',
    precision_gps VARCHAR(50) DEFAULT 'Ubicación no disponible',
    navegador VARCHAR(255) NOT NULL,
    dispositivo VARCHAR(255) NOT NULL,
    excuse_path VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for attendances queries
CREATE INDEX idx_attendances_document ON attendances(aprendiz_document);
CREATE INDEX idx_attendances_ficha ON attendances(ficha_code);

-- =========================================================================
-- Insert Sample Seed Data for testing
-- =========================================================================

-- Seed Users
INSERT INTO users (document, full_name, role) VALUES
('1000200300', 'Carlos Mario Restrepo', 'instructor'),
('1000400500', 'Ana Maria Gomez', 'instructor'),
('900800700', 'Diana Carolina Rojas', 'coordinador');

-- Seed Fichas
INSERT INTO fichas (code, program_name) VALUES
('2711425', 'Análisis y Desarrollo de Software (ADSO)'),
('2711426', 'Gestión de Redes de Datos'),
('2711427', 'Diseño e Integración de Multimedia');

-- Seed Ambientes
INSERT INTO ambientes (name) VALUES
('Ambiente 102 - Torre de Redes'),
('Ambiente 204 - Aula de Software'),
('Ambiente Móvil - Auditorio Principal');

-- Link Instructors to Fichas
-- Carlos Mario Restrepo (id: 1) -> Fichas 2711425 and 2711426
INSERT INTO instructor_fichas (instructor_id, ficha_id) VALUES
(1, 1),
(1, 2),
(2, 3);
