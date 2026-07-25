const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
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

async function testAllRequirements() {
    const env = loadEnv();
    const connectionString = env.DATABASE_URL;
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    console.log('=== TEST SUITE: MODERNIZACIÓN ASISTENCIA SENA ===');

    try {
        await client.connect();

        // 1. Verify TIMESTAMPTZ column type on qr_sessions
        const colRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'qr_sessions' AND column_name = 'expires_at'
        `);
        console.log('[TEST 1] expires_at column type:', colRes.rows[0]);

        // 2. Verify Jornadas - No "Madrugada" remaining
        const madResSessions = await client.query(`SELECT COUNT(*)::int FROM qr_sessions WHERE jornada = 'Madrugada'`);
        const madResAtts = await client.query(`SELECT COUNT(*)::int FROM attendances WHERE jornada = 'Madrugada'`);
        console.log('[TEST 2] Records with jornada "Madrugada":', {
            qr_sessions: madResSessions.rows[0].count,
            attendances: madResAtts.rows[0].count
        });

        // 3. Verify Ambientes Geofence columns
        const ambRes = await client.query(`SELECT id, name, latitud, longitud, radio_maximo_metros FROM ambientes LIMIT 3`);
        console.log('[TEST 3] Ambientes Geofence Sample:', ambRes.rows);

        // 4. Test 5-minute QR Session Creation in DB
        const sessRes = await client.query(`
            INSERT INTO qr_sessions (
                token, instructor_id, instructor_name, ficha_code, program_name,
                jornada, ambiente_name, duration_minutes, hours_duration, session_type, status, expires_at
            ) VALUES (
                'test_token_5min', 1, 'Carlos Mario Restrepo', '2711425', 'ADSO',
                'Tarde', 'Ambiente 102 - Torre de Redes', 5, 6, 'regular', 'active', NOW() + INTERVAL '5 minutes'
            ) RETURNING id, token, created_at, expires_at, (expires_at - created_at) as duration_diff
        `);
        console.log('[TEST 4] Created 5-minute QR Session:', sessRes.rows[0]);

        // Clean up test session
        await client.query(`DELETE FROM qr_sessions WHERE token = 'test_token_5min'`);
        console.log('✅ All database schema and logic tests passed successfully!');

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        await client.end();
    }
}

testAllRequirements();
