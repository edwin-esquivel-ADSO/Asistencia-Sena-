<?php
// app/controllers/CoordinadorController.php
require_once __DIR__ . '/../models/AttendanceModel.php';

class CoordinadorController {
    private $attendanceModel;

    public function __construct() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'coordinador') {
            header('Location: /login');
            exit();
        }
        $this->attendanceModel = new AttendanceModel();
    }

    public function dashboard() {
        $attendances = $this->attendanceModel->getAllAttendances();
        require_once __DIR__ . '/../views/coordinador/dashboard.php';
    }
}
?>
