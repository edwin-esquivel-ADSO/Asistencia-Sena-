const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        console.error('No se encontró el archivo .env');
        process.exit(1);
    }
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed) return;
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
            env[key] = value;
        }
    });
    return env;
}

async function migrate() {
    const env = loadEnv();
    const connectionString = env.DATABASE_URL || `postgresql://${env.DB_USERNAME}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT || 5432}/${env.DB_DATABASE}?sslmode=require`;

    console.log('Conectando a Neon PostgreSQL para ejecutar migraciones idénticas e idempotentes...');
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const sql = `
            -- 1. Users Table (Acceso sin contraseña)
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                document VARCHAR(50) UNIQUE NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                username VARCHAR(50) UNIQUE,
                email VARCHAR(150),
                password_hash VARCHAR(255),
                role VARCHAR(20) NOT NULL CHECK (role IN ('instructor', 'coordinador')),
                is_active BOOLEAN DEFAULT TRUE NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- Ensure password_hash is optional/nullable
            ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

            -- 2. Fichas Table
            CREATE TABLE IF NOT EXISTS fichas (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                program_name VARCHAR(200) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- 3. Ambientes Table (Soporte Geocerca: Latitud, Longitud, Radio Máximo en Metros)
            CREATE TABLE IF NOT EXISTS ambientes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                latitud NUMERIC(10, 7) DEFAULT NULL,
                longitud NUMERIC(10, 7) DEFAULT NULL,
                radio_maximo_metros INT DEFAULT 100,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE ambientes ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 7) DEFAULT NULL;
            ALTER TABLE ambientes ADD COLUMN IF NOT EXISTS longitud NUMERIC(10, 7) DEFAULT NULL;
            ALTER TABLE ambientes ADD COLUMN IF NOT EXISTS radio_maximo_metros INT DEFAULT 100;

            -- 4. Instructor Fichas Relation Table
            CREATE TABLE IF NOT EXISTS instructor_fichas (
                instructor_id INT REFERENCES users(id) ON DELETE CASCADE,
                ficha_id INT REFERENCES fichas(id) ON DELETE CASCADE,
                PRIMARY KEY (instructor_id, ficha_id)
            );

            -- 5. QR Sessions Table (Vigencia 5min TIMESTAMPTZ y zona horaria Colombia)
            CREATE TABLE IF NOT EXISTS qr_sessions (
                id SERIAL PRIMARY KEY,
                token VARCHAR(100) UNIQUE NOT NULL,
                instructor_id INT REFERENCES users(id) ON DELETE CASCADE,
                instructor_name VARCHAR(150),
                ficha_code VARCHAR(50),
                ficha_id INT REFERENCES fichas(id) ON DELETE SET NULL,
                program_name VARCHAR(200),
                jornada VARCHAR(50) NOT NULL,
                ambiente_name VARCHAR(100),
                ambiente_id INT REFERENCES ambientes(id) ON DELETE SET NULL,
                grupo VARCHAR(50),
                sede VARCHAR(100),
                duration_minutes INT NOT NULL DEFAULT 5,
                hours_duration INT NOT NULL DEFAULT 6,
                session_type VARCHAR(20) NOT NULL DEFAULT 'regular',
                parent_session_id INT REFERENCES qr_sessions(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMPTZ NOT NULL
            );

            ALTER TABLE qr_sessions ADD COLUMN IF NOT EXISTS instructor_name VARCHAR(150);
            ALTER TABLE qr_sessions ADD COLUMN IF NOT EXISTS ficha_code VARCHAR(50);
            ALTER TABLE qr_sessions ADD COLUMN IF NOT EXISTS program_name VARCHAR(200);
            ALTER TABLE qr_sessions ADD COLUMN IF NOT EXISTS ambiente_name VARCHAR(100);
            ALTER TABLE qr_sessions ADD COLUMN IF NOT EXISTS grupo VARCHAR(50);
            ALTER TABLE qr_sessions ADD COLUMN IF NOT EXISTS sede VARCHAR(100);
            ALTER TABLE qr_sessions ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) DEFAULT 'regular';
            ALTER TABLE qr_sessions ADD COLUMN IF NOT EXISTS parent_session_id INT REFERENCES qr_sessions(id) ON DELETE CASCADE;

            -- Migración TIMESTAMPTZ para created_at y expires_at en qr_sessions
            ALTER TABLE qr_sessions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
            ALTER TABLE qr_sessions ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';

            -- Migración Jornadas: reemplazar Madrugada por Tarde
            UPDATE qr_sessions SET jornada = 'Tarde' WHERE jornada = 'Madrugada';
            ALTER TABLE qr_sessions DROP CONSTRAINT IF EXISTS qr_sessions_jornada_check;
            ALTER TABLE qr_sessions ADD CONSTRAINT qr_sessions_jornada_check CHECK (jornada IN ('Diurna', 'Tarde', 'Nocturna', 'Mixta'));

            -- 6. Attendances Table
            CREATE TABLE IF NOT EXISTS attendances (
                id SERIAL PRIMARY KEY,
                qr_session_id INT REFERENCES qr_sessions(id) ON DELETE SET NULL,
                fecha DATE NOT NULL DEFAULT CURRENT_DATE,
                hora TIME NOT NULL DEFAULT CURRENT_TIME,
                instructor_name VARCHAR(150) NOT NULL,
                ficha_code VARCHAR(50) NOT NULL,
                jornada VARCHAR(50) NOT NULL,
                ambiente_name VARCHAR(100) NOT NULL,
                grupo VARCHAR(50),
                sede VARCHAR(100),
                aprendiz_name VARCHAR(150) NOT NULL,
                aprendiz_document VARCHAR(50) NOT NULL,
                estado VARCHAR(30) NOT NULL DEFAULT 'Presente',
                registro_tipo VARCHAR(30) NOT NULL DEFAULT 'puntual',
                horas INT NOT NULL DEFAULT 0,
                ip_publica VARCHAR(45) NOT NULL DEFAULT 'Desconocida',
                latitud VARCHAR(50) DEFAULT 'Ubicación no disponible',
                longitud VARCHAR(50) DEFAULT 'Ubicación no disponible',
                precision_gps VARCHAR(50) DEFAULT 'Ubicación no disponible',
                location_status VARCHAR(100) DEFAULT 'No capturada',
                navegador VARCHAR(255) NOT NULL DEFAULT 'Desconocido',
                dispositivo VARCHAR(255) NOT NULL DEFAULT 'Desconocido',
                excuse_path VARCHAR(255) DEFAULT NULL,
                excuse_note TEXT DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS grupo VARCHAR(50);
            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS sede VARCHAR(100);
            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS registro_tipo VARCHAR(30) DEFAULT 'puntual';
            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS location_status VARCHAR(100) DEFAULT 'No capturada';
            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS excuse_path VARCHAR(255);
            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS excuse_note TEXT;

            ALTER TABLE attendances ALTER COLUMN fecha SET DEFAULT (NOW() AT TIME ZONE 'America/Bogota')::date;
            ALTER TABLE attendances ALTER COLUMN hora SET DEFAULT (NOW() AT TIME ZONE 'America/Bogota')::time;

            -- Migración TIMESTAMPTZ para created_at y updated_at en attendances
            ALTER TABLE attendances ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
            ALTER TABLE attendances ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

            -- Reemplazar Madrugada en registros de asistencia históricos
            UPDATE attendances SET jornada = 'Tarde' WHERE jornada = 'Madrugada';

            -- 7. Aprendices Table
            CREATE TABLE IF NOT EXISTS aprendices (
                id SERIAL PRIMARY KEY,
                document VARCHAR(50) UNIQUE NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                ficha_id INT REFERENCES fichas(id) ON DELETE RESTRICT,
                is_active BOOLEAN DEFAULT TRUE NOT NULL,
                face_asset_public_id VARCHAR(255) DEFAULT NULL,
                face_descriptor_json TEXT DEFAULT NULL,
                face_registered_at TIMESTAMPTZ DEFAULT NULL,
                biometric_consent_at TIMESTAMPTZ DEFAULT NULL,
                biometric_consent_version VARCHAR(50) DEFAULT 'v1.0',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- 8. Face Verifications Table
            CREATE TABLE IF NOT EXISTS face_verifications (
                id SERIAL PRIMARY KEY,
                aprendiz_id INT REFERENCES aprendices(id) ON DELETE CASCADE,
                purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('login', 'attendance')),
                match_score NUMERIC(5, 4) DEFAULT NULL,
                result VARCHAR(30) NOT NULL CHECK (result IN ('verified', 'failed', 'manual_review')),
                failure_reason VARCHAR(255) DEFAULT NULL,
                ip_address VARCHAR(45) NOT NULL DEFAULT 'Desconocida',
                user_agent VARCHAR(255) NOT NULL DEFAULT 'Desconocido',
                browser VARCHAR(100) DEFAULT 'Desconocido',
                device VARCHAR(100) DEFAULT 'Desconocido',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- 9. Excuse Requests Table
            CREATE TABLE IF NOT EXISTS excuse_requests (
                id SERIAL PRIMARY KEY,
                aprendiz_id INT REFERENCES aprendices(id) ON DELETE CASCADE,
                attendance_id INT REFERENCES attendances(id) ON DELETE SET NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                decided_by_instructor_id INT REFERENCES users(id) ON DELETE SET NULL,
                instructor_comment TEXT DEFAULT NULL,
                decided_at TIMESTAMPTZ DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- 10. Notifications Table
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                recipient_role VARCHAR(20) NOT NULL CHECK (recipient_role IN ('instructor', 'aprendiz', 'coordinador')),
                recipient_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(200) NOT NULL,
                body TEXT NOT NULL,
                link_url VARCHAR(255) DEFAULT NULL,
                is_read BOOLEAN DEFAULT FALSE NOT NULL,
                metadata_json JSONB DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- 11. Instructor Notification Settings Table
            CREATE TABLE IF NOT EXISTS instructor_notification_settings (
                instructor_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                alert_email VARCHAR(150) DEFAULT NULL,
                email_verified BOOLEAN DEFAULT FALSE NOT NULL,
                email_verification_token VARCHAR(100) DEFAULT NULL,
                preferences_json JSONB DEFAULT '{"notify_excuses": true, "notify_absences": true}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- 12. Audit Events Table
            CREATE TABLE IF NOT EXISTS audit_events (
                id SERIAL PRIMARY KEY,
                actor_role VARCHAR(20) NOT NULL,
                actor_id INT DEFAULT NULL,
                actor_identifier VARCHAR(100) NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                target_entity VARCHAR(50) NOT NULL,
                target_id INT DEFAULT NULL,
                ip_address VARCHAR(45) NOT NULL DEFAULT 'Desconocida',
                user_agent VARCHAR(255) DEFAULT 'Desconocido',
                device VARCHAR(100) DEFAULT 'Desconocido',
                browser VARCHAR(100) DEFAULT 'Desconocido',
                metadata_json JSONB DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- Campos aditivos a aprendices
            ALTER TABLE aprendices ADD COLUMN IF NOT EXISTS deactivation_reason TEXT DEFAULT NULL;

            -- Campos aditivos a attendances
            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS tarea_registrada BOOLEAN DEFAULT FALSE;
            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS tarea_nota TEXT DEFAULT NULL;
            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS aprendiz_id INT REFERENCES aprendices(id) ON DELETE SET NULL;
            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS face_verification_id INT REFERENCES face_verifications(id) ON DELETE SET NULL;
            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS arrival_time VARCHAR(20) DEFAULT NULL;
            -- Indexes para tablas aditivas
            CREATE INDEX IF NOT EXISTS idx_users_document ON users(document);
            CREATE INDEX IF NOT EXISTS idx_users_name ON users(full_name);
            CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON qr_sessions(token);
            CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON qr_sessions(status);
            CREATE INDEX IF NOT EXISTS idx_attendances_document ON attendances(aprendiz_document);
            CREATE INDEX IF NOT EXISTS idx_attendances_ficha ON attendances(ficha_code);
            CREATE INDEX IF NOT EXISTS idx_attendances_session ON attendances(qr_session_id);
            CREATE INDEX IF NOT EXISTS idx_aprendices_document ON aprendices(document);
            CREATE INDEX IF NOT EXISTS idx_aprendices_ficha ON aprendices(ficha_id);
            CREATE INDEX IF NOT EXISTS idx_face_verifications_aprendiz ON face_verifications(aprendiz_id);
            CREATE INDEX IF NOT EXISTS idx_excuse_requests_aprendiz ON excuse_requests(aprendiz_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_role, recipient_id);
            CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_role, actor_identifier);
        `;

        await client.query(sql);
        console.log('Migración de base de datos ejecutada exitosamente.');

        // Seed initial coordinator and default instructor if not exist
        await client.query(`
            INSERT INTO users (document, full_name, role, is_active)
            VALUES ('900800700', 'Diana Carolina Rojas', 'coordinador', true)
            ON CONFLICT (document) DO UPDATE SET 
                full_name = EXCLUDED.full_name,
                is_active = true;
        `);

        await client.query(`
            INSERT INTO users (document, full_name, role, is_active)
            VALUES ('1000200300', 'Carlos Mario Restrepo', 'instructor', true)
            ON CONFLICT (document) DO UPDATE SET 
                full_name = EXCLUDED.full_name,
                is_active = true;
        `);

        // Seed initial Fichas and Ambientes if empty
        await client.query(`
            INSERT INTO fichas (code, program_name) VALUES
            ('2711425', 'Análisis y Desarrollo de Software (ADSO)'),
            ('2711426', 'Gestión de Redes de Datos'),
            ('2711427', 'Diseño e Integración de Multimedia')
            ON CONFLICT (code) DO NOTHING;

            INSERT INTO ambientes (name, latitud, longitud, radio_maximo_metros) VALUES
            ('Ambiente 102 - Torre de Redes', 4.6097100, -74.0817500, 150),
            ('Ambiente 204 - Aula de Software', 4.6098000, -74.0816000, 100),
            ('Ambiente Móvil - Auditorio Principal', NULL, NULL, 200)
            ON CONFLICT (name) DO NOTHING;
        `);

        console.log('Sembrado (Seeding) de usuarios y ambientes completado.');

    } catch (err) {
        console.error('Error en la migración:', err);
    } finally {
        await client.end();
    }
}

migrate();
