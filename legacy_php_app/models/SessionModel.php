<?php
// app/models/SessionModel.php
require_once __DIR__ . '/../config/database.php';

class SessionModel {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function createSession($instructorId, $fichaId, $jornada, $ambienteId, $durationMinutes, $hoursDuration) {
        $token = bin2hex(random_bytes(16)); // Generar token seguro
        $expiresAt = date('Y-m-d H:i:s', time() + ($durationMinutes * 60));

        $stmt = $this->db->prepare("
            INSERT INTO qr_sessions (token, instructor_id, ficha_id, jornada, ambiente_id, duration_minutes, hours_duration, expires_at)
            VALUES (:token, :instructor_id, :ficha_id, :jornada, :ambiente_id, :duration_minutes, :hours_duration, :expires_at)
            RETURNING id, token, expires_at
        ");

        $stmt->execute([
            'token' => $token,
            'instructor_id' => $instructorId,
            'ficha_id' => $fichaId,
            'jornada' => $jornada,
            'ambiente_id' => $ambienteId,
            'duration_minutes' => $durationMinutes,
            'hours_duration' => $hoursDuration,
            'expires_at' => $expiresAt
        ]);

        return $stmt->fetch();
    }

    public function getActiveSession($instructorId) {
        $stmt = $this->db->prepare("
            SELECT q.*, f.code as ficha_code, f.program_name, a.name as ambiente_name
            FROM qr_sessions q
            JOIN fichas f ON q.ficha_id = f.id
            JOIN ambientes a ON q.ambiente_id = a.id
            WHERE q.instructor_id = :instructor_id AND q.status = 'active' AND q.expires_at > NOW()
            ORDER BY q.created_at DESC LIMIT 1
        ");
        $stmt->execute(['instructor_id' => $instructorId]);
        return $stmt->fetch();
    }

    public function getSessionByToken($token) {
        $stmt = $this->db->prepare("
            SELECT q.*, f.code as ficha_code, f.program_name, a.name as ambiente_name, u.full_name as instructor_name
            FROM qr_sessions q
            JOIN fichas f ON q.ficha_id = f.id
            JOIN ambientes a ON q.ambiente_id = a.id
            JOIN users u ON q.instructor_id = u.id
            WHERE q.token = :token LIMIT 1
        ");
        $stmt->execute(['token' => $token]);
        return $stmt->fetch();
    }

    public function finishSession($sessionId) {
        $stmt = $this->db->prepare("
            UPDATE qr_sessions SET status = 'finished' WHERE id = :id
        ");
        return $stmt->execute(['id' => $sessionId]);
    }
}
