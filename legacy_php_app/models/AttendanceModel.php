<?php
// app/models/AttendanceModel.php
require_once __DIR__ . '/../config/database.php';

class AttendanceModel {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function register($data) {
        // Validar si ya está registrado en esta sesión específica
        $checkStmt = $this->db->prepare("
            SELECT id FROM attendances 
            WHERE qr_session_id = :qr_session_id AND aprendiz_document = :document
        ");
        $checkStmt->execute([
            'qr_session_id' => $data['qr_session_id'],
            'document' => $data['aprendiz_document']
        ]);
        if ($checkStmt->fetch()) {
            return ['status' => 'already_registered', 'message' => 'Ya has registrado tu asistencia para esta sesión.'];
        }

        $stmt = $this->db->prepare("
            INSERT INTO attendances (
                qr_session_id, instructor_name, ficha_code, jornada, ambiente_name, 
                aprendiz_name, aprendiz_document, estado, horas, ip_publica, 
                latitud, longitud, precision_gps, navegador, dispositivo
            ) VALUES (
                :qr_session_id, :instructor_name, :ficha_code, :jornada, :ambiente_name, 
                :aprendiz_name, :aprendiz_document, 'Presente', :horas, :ip_publica, 
                :latitud, :longitud, :precision_gps, :navegador, :dispositivo
            )
        ");

        $success = $stmt->execute([
            'qr_session_id' => $data['qr_session_id'],
            'instructor_name' => $data['instructor_name'],
            'ficha_code' => $data['ficha_code'],
            'jornada' => $data['jornada'],
            'ambiente_name' => $data['ambiente_name'],
            'aprendiz_name' => $data['aprendiz_name'],
            'aprendiz_document' => $data['aprendiz_document'],
            'horas' => $data['horas'],
            'ip_publica' => $data['ip_publica'],
            'latitud' => $data['latitud'],
            'longitud' => $data['longitud'],
            'precision_gps' => $data['precision_gps'],
            'navegador' => $data['navegador'],
            'dispositivo' => $data['dispositivo']
        ]);

        return $success ? ['status' => 'success'] : ['status' => 'error', 'message' => 'Error al guardar registro.'];
    }

    public function getActiveSessionAttendances($sessionId) {
        $stmt = $this->db->prepare("
            SELECT * FROM attendances 
            WHERE qr_session_id = :qr_session_id 
            ORDER BY hora DESC
        ");
        $stmt->execute(['qr_session_id' => $sessionId]);
        return $stmt->fetchAll();
    }

    public function getAprendizHistory($document) {
        $stmt = $this->db->prepare("
            SELECT * FROM attendances 
            WHERE aprendiz_document = :document 
            ORDER BY fecha DESC, hora DESC
        ");
        $stmt->execute(['document' => $document]);
        return $stmt->fetchAll();
    }

    public function getInstructorHistory($instructorName) {
        $stmt = $this->db->prepare("
            SELECT * FROM attendances 
            WHERE instructor_name = :instructor_name 
            ORDER BY fecha DESC, hora DESC
        ");
        $stmt->execute(['instructor_name' => $instructorName]);
        return $stmt->fetchAll();
    }

    public function getAllAttendances() {
        $stmt = $this->db->query("
            SELECT * FROM attendances 
            ORDER BY fecha DESC, hora DESC
        ");
        return $stmt->fetchAll();
    }

    public function updateStatusAndHours($id, $estado, $horas) {
        $stmt = $this->db->prepare("
            UPDATE attendances 
            SET estado = :estado, horas = :horas, updated_at = NOW() 
            WHERE id = :id
        ");
        return $stmt->execute([
            'id' => $id,
            'estado' => $estado,
            'horas' => $horas
        ]);
    }

    public function updateExcuse($id, $filePath) {
        $stmt = $this->db->prepare("
            UPDATE attendances 
            SET excuse_path = :path, estado = 'Justificado', updated_at = NOW() 
            WHERE id = :id
        ");
        return $stmt->execute([
            'id' => $id,
            'path' => $filePath
        ]);
    }

    public function getAttendanceById($id) {
        $stmt = $this->db->prepare("SELECT * FROM attendances WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }
}
?>
