<?php
// app/controllers/InstructorController.php
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/SessionModel.php';
require_once __DIR__ . '/../models/AttendanceModel.php';
require_once __DIR__ . '/../helpers/CSRFHelper.php';

class InstructorController {
    private $userModel;
    private $sessionModel;
    private $attendanceModel;

    public function __construct() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'instructor') {
            header('Location: /login');
            exit();
        }
        $this->userModel = new UserModel();
        $this->sessionModel = new SessionModel();
        $this->attendanceModel = new AttendanceModel();
    }

    public function dashboard() {
        $user = $_SESSION['user'];
        
        // Verificar si ya hay una sesión activa
        $activeSession = $this->sessionModel->getActiveSession($user['id']);
        if ($activeSession) {
            header('Location: /instructor/session-active');
            exit();
        }

        $fichas = $this->userModel->getUserFichas($user['id']);
        $ambientes = $this->userModel->getAllAmbientes();
        $error = null;

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (!CSRFHelper::validate($_POST['csrf_token'] ?? '')) {
                $error = "Token de seguridad expirado o inválido.";
            } else {
                $fichaId = $_POST['ficha_id'] ?? '';
                $jornada = $_POST['jornada'] ?? '';
                $ambienteId = $_POST['ambiente_id'] ?? '';
                $duration = intval($_POST['duration_minutes'] ?? 15);
                $hours = intval($_POST['hours_duration'] ?? 6);

                if (empty($fichaId) || empty($jornada) || empty($ambienteId) || $duration <= 0 || $hours <= 0) {
                    $error = "Todos los campos son obligatorios.";
                } else {
                    $session = $this->sessionModel->createSession($user['id'], $fichaId, $jornada, $ambienteId, $duration, $hours);
                    if ($session) {
                        header('Location: /instructor/session-active');
                        exit();
                    } else {
                        $error = "No se pudo iniciar la sesión. Intente nuevamente.";
                    }
                }
            }
        }

        require_once __DIR__ . '/../views/instructor/dashboard.php';
    }

    public function sessionActive() {
        $user = $_SESSION['user'];
        $activeSession = $this->sessionModel->getActiveSession($user['id']);
        
        if (!$activeSession) {
            header('Location: /instructor/dashboard');
            exit();
        }

        require_once __DIR__ . '/../views/instructor/session_active.php';
    }

    public function activeAttendancesPoll() {
        $user = $_SESSION['user'];
        $activeSession = $this->sessionModel->getActiveSession($user['id']);
        header('Content-Type: application/json');

        if (!$activeSession) {
            echo json_encode(['status' => 'inactive']);
            exit();
        }

        $attendances = $this->attendanceModel->getActiveSessionAttendances($activeSession['id']);
        echo json_encode([
            'status' => 'active',
            'expires_at' => $activeSession['expires_at'],
            'data' => $attendances
        ]);
        exit();
    }

    public function finishSession() {
        $user = $_SESSION['user'];
        $activeSession = $this->sessionModel->getActiveSession($user['id']);
        
        if ($activeSession && $_SERVER['REQUEST_METHOD'] === 'POST') {
            if (CSRFHelper::validate($_POST['csrf_token'] ?? '')) {
                $this->sessionModel->finishSession($activeSession['id']);
            }
        }
        header('Location: /instructor/dashboard');
        exit();
    }

    public function history() {
        $user = $_SESSION['user'];
        $attendances = $this->attendanceModel->getInstructorHistory($user['full_name']);
        require_once __DIR__ . '/../views/instructor/history.php';
    }

    public function editRecord() {
        header('Content-Type: application/json');
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (!CSRFHelper::validate($_POST['csrf_token'] ?? '')) {
                echo json_encode(['status' => 'error', 'message' => 'Token CSRF inválido.']);
                exit();
            }

            $id = intval($_POST['id'] ?? 0);
            $estado = $_POST['estado'] ?? '';
            $horas = intval($_POST['horas'] ?? 0);

            if ($id > 0 && in_array($estado, ['Presente', 'Falta', 'Tarde', 'Justificado']) && $horas >= 0) {
                if ($this->attendanceModel->updateStatusAndHours($id, $estado, $horas)) {
                    echo json_encode(['status' => 'success']);
                    exit();
                }
            }
        }
        echo json_encode(['status' => 'error', 'message' => 'Datos inválidos.']);
        exit();
    }

    public function uploadExcuse() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (!CSRFHelper::validate($_POST['csrf_token'] ?? '')) {
                die("Token CSRF inválido.");
            }

            $attendanceId = intval($_POST['attendance_id'] ?? 0);
            if ($attendanceId <= 0) {
                die("Registro inválido.");
            }

            if (isset($_FILES['excuse_file']) && $_FILES['excuse_file']['error'] === UPLOAD_ERR_OK) {
                $fileTmpPath = $_FILES['excuse_file']['tmp_name'];
                $fileName = $_FILES['excuse_file']['name'];
                $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

                $allowedExtensions = ['pdf', 'jpg', 'png', 'jpeg'];
                if (in_array($fileExtension, $allowedExtensions)) {
                    $uploadDir = __DIR__ . '/../../public/uploads/';
                    if (!is_dir($uploadDir)) {
                        mkdir($uploadDir, 0755, true);
                    }

                    $newFileName = 'excusa_' . $attendanceId . '_' . time() . '.' . $fileExtension;
                    $destPath = $uploadDir . $newFileName;

                    if (move_uploaded_file($fileTmpPath, $destPath)) {
                        $relativeRoute = '/uploads/' . $newFileName;
                        $this->attendanceModel->updateExcuse($attendanceId, $relativeRoute);
                    }
                }
            }
        }
        header('Location: /instructor/history');
        exit();
    }
}
?>
