// seed-ficha-3413974.js
// Script para insertar la ficha 3413974 y sus 30 aprendices en la BD de Neon PostgreSQL
// Ejecutar con: node seed-ficha-3413974.js

const { Pool } = require('pg');

// DATABASE_URL directo (igual que en .env)
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_NUoJiLEAI26C@ep-empty-haze-ayjs685e.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const FICHA_CODE = '3413974';
const PROGRAM_NAME = 'Análisis y Desarrollo de Software';

const APRENDICES = [
  { full_name: 'BRENDA CAROLINA GALEANO RAMIREZ', document: '1019992785' },
  { full_name: 'ANDRES FERNANDO SALINAS VARGAS', document: '1029881661' },
  { full_name: 'MARTIN JULIAN TORRES FIERRO', document: '1075795095' },
  { full_name: 'MIGUEL ANGEL ESTRADA TORRENTES', document: '1075795530' },
  { full_name: 'JULIAN STIVEN CAMARGO LOPEZ', document: '1076505536' },
  { full_name: 'JUAN DIEGO HERNANDEZ VELASCO', document: '1077228216' },
  { full_name: 'JUAN MIGUEL MUÑOZ CASTAÑEDA', document: '1077228724' },
  { full_name: 'TOMAS BARRERA ORTIZ', document: '1077228780' },
  { full_name: 'JUAN PABLO CHACON BARRAGAN', document: '1077229021' },
  { full_name: 'JOAN SEBASTIAN VARGAS RAMOS', document: '1077720388' },
  { full_name: 'ANDRES FELIPE CASTRO BEDOYA', document: '1077721899' },
  { full_name: 'JEISON FERNANDO JOAQUI RODRIGUEZ', document: '1979176003' },
  { full_name: 'JAMINTON YEIR PEÑA GUARNICA', document: '1130145427' },
  { full_name: 'JUAN PABLO DORIA CAVIEDES', document: '1013124448' },
  { full_name: 'NICOLAS ESTEBAN ALDANA DORIA', document: '1013126882' },
  { full_name: 'KEVIN SANTIAGO SAAVEDRA CHANTRIS', document: '1028841644' },
  { full_name: 'JOSEPH FELIPE AGUIRRE CHURTA', document: '1029664379' },
  { full_name: 'JUAN DAVID GOMEZ MARTINEZ', document: '1076907128' },
  { full_name: 'JUAN JOSE HORTA MENDEZ', document: '1076907657' },
  { full_name: 'JUAN MATHIAS PALACIOS BOTELLO', document: '1076907757' },
  { full_name: 'JHORMAN JAMIR PASCUAS LARA', document: '1077229674' },
  { full_name: 'JHON STIVEN ALBA QUIROGA', document: '1077230509' },
  { full_name: 'KEVIN EDUARDO ARGUELLO SOLANO', document: '1077231385' },
  { full_name: 'SANTIAGO JAVELA OSPINO', document: '1077725742' },
  { full_name: 'JOSE ESNEIDER COVALEDA HORTUA', document: '1077726131' },
  { full_name: 'SIMON ANDRES VEGA SERRATO', document: '1077726647' },
  { full_name: 'PAULA SOFIA CLAROS NAÑEZ', document: '1079177484' },
  { full_name: 'ADRIAN ESTIBEN GARRIDO PEDROZA', document: '1079178215' },
  { full_name: 'EDWIN ALEJANDRO ESQUIVEL BAHAMON', document: '1082804399' },
  { full_name: 'JUAN SEBASTIAN MEDINA CARDOZO', document: '1033101966' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insertar o actualizar la ficha
    const fichaRes = await client.query(
      `INSERT INTO fichas (code, program_name)
       VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET program_name = EXCLUDED.program_name
       RETURNING id, code, program_name`,
      [FICHA_CODE, PROGRAM_NAME]
    );
    const ficha = fichaRes.rows[0];
    console.log(`✅ Ficha upserted: ${ficha.code} - ${ficha.program_name} (id: ${ficha.id})`);

    // 2. Insertar aprendices
    let inserted = 0;
    let updated = 0;

    for (const ap of APRENDICES) {
      // Verificar si ya existe por documento
      const existing = await client.query(
        `SELECT id FROM aprendices WHERE document = $1 LIMIT 1`,
        [ap.document]
      );

      if (existing.rows.length > 0) {
        // Actualizar ficha y estado si ya existe
        await client.query(
          `UPDATE aprendices SET full_name = $1, ficha_id = $2, is_active = true, updated_at = NOW()
           WHERE document = $3`,
          [ap.full_name, ficha.id, ap.document]
        );
        console.log(`  ↻ Updated: ${ap.full_name} (${ap.document})`);
        updated++;
      } else {
        // Insertar nuevo aprendiz
        await client.query(
          `INSERT INTO aprendices (full_name, document, ficha_id, is_active)
           VALUES ($1, $2, $3, true)`,
          [ap.full_name, ap.document, ficha.id]
        );
        console.log(`  + Inserted: ${ap.full_name} (${ap.document})`);
        inserted++;
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ SEED COMPLETADO:`);
    console.log(`   Ficha: ${FICHA_CODE} - ${PROGRAM_NAME}`);
    console.log(`   Aprendices insertados: ${inserted}`);
    console.log(`   Aprendices actualizados: ${updated}`);
    console.log(`   Total: ${APRENDICES.length}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed, rollback realizado:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
