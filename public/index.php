<?php
// public/index.php
// Main front controller / router for the SENA Attendance Management System

// Configuración de errores para ambiente local
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Cargar Helpers obligatorios
require_once __DIR__ . '/../app/helpers/CSRFHelper.php';
CSRFHelper::init();

// Capturar URI limpia
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Enrutador sencillo
switch ($requestUri) {
    case '/':
    case '/login':
        require_once __DIR__ . '/../app/controllers/AuthController.php';
        $controller = new AuthController();
        $controller->login();
        break;

    case '/logout':
        require_once __DIR__ . '/../app/controllers/AuthController.php';
        $controller = new AuthController();
        $controller->logout();
        break;

    // Rutas del Instructor
    case '/instructor/dashboard':
        require_once __DIR__ . '/../app/controllers/InstructorController.php';
        $controller = new InstructorController();
        $controller->dashboard();
        break;

    case '/instructor/session-active':
        require_once __DIR__ . '/../app/controllers/InstructorController.php';
        $controller = new InstructorController();
        $controller->sessionActive();
        break;

    case '/instructor/active-attendances-poll':
        require_once __DIR__ . '/../app/controllers/InstructorController.php';
        $controller = new InstructorController();
        $controller->activeAttendancesPoll();
        break;

    case '/instructor/finish-session':
        require_once __DIR__ . '/../app/controllers/InstructorController.php';
        $controller = new InstructorController();
        $controller->finishSession();
        break;

    case '/instructor/history':
        require_once __DIR__ . '/../app/controllers/InstructorController.php';
        $controller = new InstructorController();
        $controller->history();
        break;

    case '/instructor/edit-record':
        require_once __DIR__ . '/../app/controllers/InstructorController.php';
        $controller = new InstructorController();
        $controller->editRecord();
        break;

    case '/instructor/upload-excuse':
        require_once __DIR__ . '/../app/controllers/InstructorController.php';
        $controller = new InstructorController();
        $controller->uploadExcuse();
        break;

    // Rutas de Aprendiz
    case '/aprendiz/register':
        require_once __DIR__ . '/../app/controllers/AprendizController.php';
        $controller = new AprendizController();
        $controller->register();
        break;

    case '/aprendiz/my-attendance':
        require_once __DIR__ . '/../app/controllers/AprendizController.php';
        $controller = new AprendizController();
        $controller->myAttendance();
        break;

    // Rutas de Coordinador
    case '/coordinador/dashboard':
        require_once __DIR__ . '/../app/controllers/CoordinadorController.php';
        $controller = new CoordinadorController();
        $controller->dashboard();
        break;

    default:
        // Manejo 404
        http_response_code(404);
        require_once __DIR__ . '/../app/views/layouts/header.php';
        echo '<div class="container text-center" style="margin-top: 50px;">
                <h2>Error 404</h2>
                <p class="subtitle">La página que busca no existe o ha sido movida.</p>
                <a href="/" class="btn-primary" style="margin-top:20px;">Volver al Inicio</a>
              </div>';
        require_once __DIR__ . '/../app/views/layouts/footer.php';
        break;
}
?>
