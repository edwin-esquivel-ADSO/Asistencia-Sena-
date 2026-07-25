<?php
// app/config/database.php
// Conexión segura a Neon PostgreSQL - compatible con libpq sin SNI (XAMPP local)

class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        // Cargar variables de entorno desde .env en la raíz del proyecto
        $envPath = __DIR__ . '/../../.env';
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0) continue;
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $name  = trim($parts[0]);
                    $value = trim($parts[1]);
                    $value = trim($value, "\"'");
                    putenv("{$name}={$value}");
                    $_ENV[$name]    = $value;
                    $_SERVER[$name] = $value;
                }
            }
        }

        $databaseUrl = getenv('DATABASE_URL');

        if ($databaseUrl) {
            // Parsear DATABASE_URL
            $p = parse_url($databaseUrl);
            $host     = $p['host'];
            $port     = isset($p['port']) ? $p['port'] : '5432';
            $dbname   = ltrim($p['path'], '/');
            // Quitar parámetros del dbname si vienen en la URL
            if (strpos($dbname, '?') !== false) {
                $dbname = substr($dbname, 0, strpos($dbname, '?'));
            }
            $user     = urldecode($p['user']);
            $password = urldecode($p['pass']);
        } else {
            // Fallback a variables individuales
            $host     = getenv('DB_HOST')     ?: 'ep-empty-haze-ayjs685e.c-5.us-east-2.aws.neon.tech';
            $port     = getenv('DB_PORT')     ?: '5432';
            $dbname   = getenv('DB_DATABASE') ?: 'neondb';
            $user     = getenv('DB_USERNAME') ?: 'neondb_owner';
            $password = getenv('DB_PASSWORD') ?: 'npg_NUoJiLEAI26C';
        }

        // Extraer endpoint ID (primera parte del host) para compatibilidad con libpq < PostgreSQL 14
        // Neon requiere SNI; si libpq no lo soporta, usamos options='endpoint=ep-xxx' en el DSN.
        $endpoint = explode('.', $host)[0];

        // DSN con options='endpoint=...' - solución documentada por Neon para libpq antiguo
        $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode=require;options='endpoint={$endpoint}'";

        try {
            $this->conn = new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            // Ocultar credenciales en el mensaje de error público
            $safeMsg = 'Error de conexión a la base de datos. Verifique la configuración en .env y revise README.md.';
            // En modo CLI o desarrollo: mostrar el error real
            if (php_sapi_name() === 'cli' || (getenv('APP_DEBUG') === 'true')) {
                $safeMsg .= ' [DEBUG] ' . $e->getMessage();
            }
            die($safeMsg);
        }
    }

    public static function getInstance(): Database {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection(): PDO {
        return $this->conn;
    }

    // Prevenir clonación y deserialización del singleton
    private function __clone() {}
    public function __wakeup() { throw new \Exception("Cannot unserialize singleton"); }
}
