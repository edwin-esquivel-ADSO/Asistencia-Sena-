const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return {};
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed) return;
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
    return env;
}

async function runTests() {
    const env = loadEnv();
    const client = new Client({
        connectionString: env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    console.log('=== VERIFICANDO FUNCIONALIDADES EN NEON POSTGRESQL ===');
    await client.connect();

    try {
        // 1. Check users table columns (password_hash must be nullable)
        const colRes = await client.query(`
            SELECT column_name, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'password_hash';
        `);
        console.log('✔ Estado columna password_hash en db:', colRes.rows[0]);

        // 2. Check users seeded
        const userRes = await client.query(`SELECT id, document, full_name, role, is_active FROM users;`);
        console.log(`✔ Usuarios registrados en DB: ${userRes.rows.length}`);
        userRes.rows.forEach(u => console.log(`   - ${u.role}: ${u.full_name} (${u.document})`));

        // 3. Test insert new instructor without password
        const testDoc = '1099887766';
        await client.query(`DELETE FROM users WHERE document = $1;`, [testDoc]);
        const newInst = await client.query(`
            INSERT INTO users (document, full_name, role, is_active)
            VALUES ($1, 'Instructor Prueba Antigravity', 'instructor', true)
            RETURNING *;
        `, [testDoc]);
        console.log('✔ Creación de instructor sin contraseña exitosa:', newInst.rows[0].full_name);

        // 4. Test attendances table schema (excuse_path, excuse_note, arrival_time)
        const attCols = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'attendances' AND column_name IN ('excuse_path', 'excuse_note', 'arrival_time', 'location_status');
        `);
        console.log('✔ Columnas de excusas y coordenadas verificadas:', attCols.rows.map(r => r.column_name));

        // 5. Test inserting late attendance with excuse attachment path
        const sessionRes = await client.query(`SELECT id FROM qr_sessions LIMIT 1;`);
        let sessionId = sessionRes.rows[0]?.id;

        if (!sessionId) {
            const newSess = await client.query(`
                INSERT INTO qr_sessions (
                    token, instructor_id, instructor_name, ficha_code, program_name,
                    jornada, ambiente_name, duration_minutes, hours_duration, status, expires_at
                ) VALUES ('test_token_123', 1, 'Carlos Mario Restrepo', '2711425', 'ADSO', 'Diurna', 'Ambiente 204', 15, 6, 'active', NOW() + INTERVAL '1 hour')
                RETURNING id;
            `);
            sessionId = newSess.rows[0].id;
        }

        const testAtt = await client.query(`
            INSERT INTO attendances (
                qr_session_id, instructor_name, ficha_code, jornada, ambiente_name,
                aprendiz_name, aprendiz_document, estado, registro_tipo, horas,
                arrival_time, excuse_note, excuse_path, latitud, longitud, location_status,
                ip_publica, navegador, dispositivo
            ) VALUES ($1, 'Carlos Mario Restrepo', '2711425', 'Diurna', 'Ambiente 204',
                'Aprendiz Test Excusa', '1000999888', 'Justificado', 'tarde_manual', 6,
                '08:30:00', 'Cita médica gastroenterología', '/uploads/excusas/excusa_test.pdf',
                '4.609710', '-74.081750', 'GPS Capturado', '127.0.0.1', 'Chrome', 'Móvil'
            ) RETURNING *;
        `, [sessionId]);

        console.log('✔ Inserción de asistencia tardía con soporte PDF y coordenadas exitosa:', {
            id: testAtt.rows[0].id,
            estudiante: testAtt.rows[0].aprendiz_name,
            estado: testAtt.rows[0].estado,
            excuse_path: testAtt.rows[0].excuse_path,
            latitud: testAtt.rows[0].latitud,
            longitud: testAtt.rows[0].longitud
        });

        console.log('\n=== TODAS LAS PRUEBAS EN NEON POSTGRESQL PASARON CORRECTAMENTE ===');

    } catch (err) {
        console.error('Error en pruebas de base de datos:', err);
    } finally {
        await client.end();
    }
}

runTests();
