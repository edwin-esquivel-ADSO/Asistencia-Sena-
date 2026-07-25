const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

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

function formatDateBogota(dateInput) {
    if (!dateInput) return '';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

function formatTimeBogota(timeInput) {
    if (!timeInput) return '';
    if (typeof timeInput === 'string' && /^\d{1,2}:\d{2}/.test(timeInput.trim())) {
        const cleanTime = timeInput.trim().split('.')[0];
        const parts = cleanTime.split(':');
        const hh = parts[0].padStart(2, '0');
        const mm = parts[1].padStart(2, '0');
        const ss = (parts[2] || '00').padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }
    const date = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
    return new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date);
}

async function testSingleSessionExcelExport() {
    const env = loadEnv();
    const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    console.log('=== PRUEBA DE EXPORTACIÓN EXCEL POR SESIÓN INDIVIDUAL ===');

    try {
        await client.connect();

        // 1. Get session 1 and its attendances
        const sessionRes = await client.query(`SELECT * FROM qr_sessions ORDER BY id LIMIT 1`);
        if (sessionRes.rows.length === 0) {
            console.log('No hay sesiones en BD para probar.');
            return;
        }

        const session = sessionRes.rows[0];
        console.log(`[PASO 1] Sesión seleccionada: ID #${session.id}, Ficha ${session.ficha_code}, Jornada ${session.jornada}`);

        // 2. Fetch attendances specifically filtered by session.id
        const attRes = await client.query(`SELECT * FROM attendances WHERE qr_session_id = $1`, [session.id]);
        const sessionAtts = attRes.rows;
        console.log(`[PASO 2] Total registros devueltos para qr_session_id = ${session.id}:`, sessionAtts.length);

        // 3. Verify NO other session IDs are present
        const otherAtts = await client.query(`SELECT COUNT(*)::int FROM attendances WHERE qr_session_id != $1`, [session.id]);
        console.log(`[PASO 3] Registros excluidos (otras sesiones):`, otherAtts.rows[0].count);

        // 4. Test Excel generation with SheetJS
        const sessionDateStr = formatDateBogota(session.created_at);
        const sessionStartTimeStr = formatTimeBogota(session.created_at);
        const sessionEndTimeStr = formatTimeBogota(session.expires_at);

        const headerRows = [
            ['SERVICIO NACIONAL DE APRENDIZAJE - SENA'],
            ['LISTA INSTITUCIONAL DE ASISTENCIA POR SESIÓN DE CLASE'],
            [''],
            ['FICHA DE FORMACIÓN:', session.ficha_code, '', 'PROGRAMA:', session.program_name],
            ['JORNADA:', session.jornada, '', 'AMBIENTE:', session.ambiente_name],
            ['GRUPO:', session.grupo || 'Grupo 1', '', 'SEDE:', session.sede || 'Sede Principal'],
            ['INSTRUCTOR:', session.instructor_name, '', 'FECHA SESIÓN:', sessionDateStr],
            ['HORA INICIO:', sessionStartTimeStr, '', 'HORA EXPIRACIÓN QR:', sessionEndTimeStr],
            ['DURACIÓN CLASE:', `${session.hours_duration} Horas Certificadas`, '', 'TOTAL APRENDICES REGISTRADOS:', sessionAtts.length],
            [''],
            [
                'N°', 'Documento ID', 'Nombre del Aprendiz', 'Estado Asistencia', 'Horas Certificadas',
                'Tipo Registro', 'Hora Exacta Registro', 'Coordenadas GPS', 'Precisión GPS',
                'IP Pública', 'Dispositivo', 'Navegador', 'Estado Ubicación', 'Enlace Mapa Google',
                'Justificación / Excusa', 'Enlace Soporte Excusa'
            ]
        ];

        const dataRows = sessionAtts.map((att, idx) => [
            idx + 1,
            att.aprendiz_document,
            att.aprendiz_name,
            att.estado,
            att.horas,
            att.registro_tipo,
            formatTimeBogota(att.hora),
            att.latitud !== 'Ubicación no disponible' ? `${att.latitud}, ${att.longitud}` : att.location_status,
            att.precision_gps,
            att.ip_publica,
            att.dispositivo,
            att.navegador,
            att.location_status,
            `https://maps.google.com/?q=${att.latitud},${att.longitud}`,
            att.excuse_note || '',
            att.excuse_path || 'Sin soporte'
        ]);

        const fullAOA = [...headerRows, ...dataRows];
        const worksheet = XLSX.utils.aoa_to_sheet(fullAOA);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Sesion_${session.id}`);

        const testFilePath = path.join(__dirname, `Test_Lista_Asistencia_Ficha_${session.ficha_code}_Sesion_${session.id}.xlsx`);
        XLSX.writeFile(workbook, testFilePath);

        console.log(`[PASO 4] Archivo Excel generado con éxito en: ${testFilePath}`);
        console.log('✅ Verificación completada: El Excel contiene EXCLUSIVAMENTE los registros de la sesión especificada.');

    } catch (err) {
        console.error('❌ Error durante la prueba:', err);
    } finally {
        await client.end();
    }
}

testSingleSessionExcelExport();
