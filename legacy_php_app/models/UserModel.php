<?php
// app/models/UserModel.php
require_once __DIR__ . '/../config/database.php';

class UserModel {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function findByDocumentAndName($document, $fullName) {
        // Buscamos coincidencia exacta por documento, y validamos el nombre de manera limpia y segura
        $stmt = $this->db->prepare("SELECT * FROM users WHERE document = :document LIMIT 1");
        $stmt->execute(['document' => trim($document)]);
        $user = $stmt->fetch();

        if ($user) {
            // Hacemos una comparación básica sin distinguir mayúsculas/minúsculas para facilidad de uso
            if (strcasecmp(trim($user['full_name']), trim($fullName)) === 0) {
                return $user;
            }
        }
        return false;
    }

    public function getUserFichas($userId) {
        $stmt = $this->db->prepare("
            SELECT f.* FROM fichas f
            JOIN instructor_fichas ifi ON f.id = ifi.ficha_id
            WHERE ifi.instructor_id = :userId
        ");
        $stmt->execute(['userId' => $userId]);
        return $stmt->fetchAll();
    }

    public function getAllAmbientes() {
        $stmt = $this->db->query("SELECT * FROM ambientes ORDER BY name ASC");
        return $stmt->fetchAll();
    }
}
