const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure pg is installed
try {
    require.resolve('pg');
} catch (e) {
    console.log('Instalando módulo "pg" para conectar con PostgreSQL...');
    execSync('npm install pg', { stdio: 'inherit' });
}

const { Client } = require('pg');

// Read .env file
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('No se encontró el archivo .env. Por favor créalo basándote en .env.example');
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

async function main() {
    const env = loadEnv();
    const connectionString = env.DATABASE_URL || `postgresql://${env.DB_USERNAME}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT || 5432}/${env.DB_DATABASE}?sslmode=require`;

    const sqlPath = path.join(__dirname, 'database', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Conectando a Neon PostgreSQL con credenciales del archivo .env...');
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Conexión exitosa a Neon!');
        
        console.log('Ejecutando schema.sql...');
        await client.query(sql);
        console.log('¡Tablas creadas e inicializadas con éxito!');
    } catch (err) {
        console.error('Error al conectar o ejecutar SQL:', err.message || err);
    } finally {
        try {
            await client.end();
        } catch(e) {}
    }
}

main();
