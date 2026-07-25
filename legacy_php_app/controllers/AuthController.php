<?php
// app/controllers/AuthController.php
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../helpers/CSRFHelper.php';

class AuthController {
    private $userModel;

    public function __construct() {
        $this->userModel = new UserModel();
    }

    public function login() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // Si ya está autenticado
        if (isset($_SESSION['user'])) {
            $this->redirectDashboard($_SESSION['user']['role']);
        }

        $error = null;

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            CSRFHelper::init();
            if (!CSRFHelper::validate($_POST['csrf_token'] ?? '')) {
                $error = "Token CSRF inválido. Intente de nuevo.";
            } else if (!isset($_POST['accept_terms'])) {
                $error = "Debe aceptar los términos de tratamiento de datos personales.";
            } else {
                $fullName = $_POST['full_name'] ?? '';
                $document = $_POST['document'] ?? '';

                if (empty($fullName) || empty($document)) {
                    $error = "Todos los campos son obligatorios.";
                } else {
                    $user = $this->userModel->findByDocumentAndName($document, $fullName);
                    if ($user) {
                        $_SESSION['user'] = [
                            'id' => $user['id'],
                            'document' => $user['document'],
                            'full_name' => $user['full_name'],
                            'role' => $user['role']
                        ];
                        $this->redirectDashboard($user['role']);
                    } else {
                        $error = "Datos inválidos. Verifique su nombre y número de documento.";
                    }
                }
            }
        }

        require_once __DIR__ . '/../views/auth/login.php';
    }

    public function logout() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION = [];
        session_destroy();
        header('Location: /login');
        exit();
    }

    private function redirectDashboard($role) {
        if ($role === 'instructor') {
            header('Location: /instructor/dashboard');
        } else if ($role === 'coordinador') {
            header('Location: /coordinador/dashboard');
        }
        exit();
    }
}
