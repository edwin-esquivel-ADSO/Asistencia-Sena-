<?php
// app/controllers/AprendizController.php
require_once __DIR__ . '/../models/SessionModel.php';
require_once __DIR__ . '/../models/AttendanceModel.php';
require_once __DIR__ . '/../helpers/CSRFHelper.php';

class AprendizController {
    private $sessionModel;
    private $attendanceModel;

    public function __construct() {
        $this->sessionModel = new SessionModel();
        $this->attendanceModel = new AttendanceModel();
    }

    public function register($token = null) {
        if (!$token) {
            $token = $_GET['token'] ?? '';
        }

        $session = $this->sessionModel->getSessionByToken($token);
        $error = null;
        $success = null;

        if (!$session) {
            $error = "El código QR escaneado es inválido o no existe en el sistema.";
            require_once __DIR__ . '/../views/aprendiz/register.php';
            return;
        }

        // Comprobar expiración de la sesión QR
        if (strtotime($session['expires_at']) < time() || $session['status'] !== 'active') {
            $error = "Este código QR ha expirado o la sesión ha sido finalizada por el instructor.";
            require_once __DIR__ . '/../views/aprendiz/register.php';
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (!CSRFHelper::validate($_POST['csrf_token'] ?? '')) {
                $error = "Token de seguridad inválido.";
            } else {
                $fullName = trim($_POST['full_name'] ?? '');
                $document = trim($_POST['document'] ?? '');

                if (empty($fullName) || empty($document)) {
                    $error = "Por favor ingrese su Nombre Completo y Documento de Identidad.";
                } else {
                    // Obtener detalles del cliente del lado del servidor
                    $ip = $_SERVER['REMOTE_ADDR'] ?? 'Desconocida';
                    // Intentar obtener IP real si pasa por proxy/Vercel
                    if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
                        $ip = trim($ips[0]);
                    }

                    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Desconocido';
                    $navegador = $this->getBrowserName($userAgent);
                    $dispositivo = $this->getDeviceName($userAgent);

                    $lat = $_POST['latitud'] ?? 'Ubicación no disponible';
                    $lng = $_POST['longitud'] ?? 'Ubicación no disponible';
                    $acc = $_POST['precision_gps'] ?? 'Ubicación no disponible';

                    $attendanceData = [
                        'qr_session_id' => $session['id'],
                        'instructor_name' => $session['instructor_name'],
                        'ficha_code' => $session['ficha_code'],
                        'jornada' => $session['jornada'],
                        'ambiente_name' => $session['ambiente_name'],
                        'aprendiz_name' => $fullName,
                        'aprendiz_document' => $document,
                        'horas' => $session['hours_duration'],
                        'ip_publica' => $ip,
                        'latitud' => $lat,
                        'longitud' => $lng,
                        'precision_gps' => $acc,
                        'navegador' => $navegador,
                        'dispositivo' => $dispositivo
                    ];

                    $res = $this->attendanceModel->register($attendanceData);
                    if ($res['status'] === 'success') {
                        $success = "¡Asistencia registrada correctamente! Ya puedes cerrar esta pestaña.";
                    } else {
                        $error = $res['message'];
                    }
                }
            }
        }

        require_once __DIR__ . '/../views/aprendiz/register.php';
    }

    public function myAttendance() {
        $document = $_GET['document'] ?? '';
        $attendances = [];
        $searched = false;

        if (!empty($document)) {
            $attendances = $this->attendanceModel->getAprendizHistory($document);
            $searched = true;
        }

        require_once __DIR__ . '/../views/aprendiz/my_attendance.php';
    }

    private function getBrowserName($userAgent) {
        $t = strtolower($userAgent);
        if (strpos($t, 'opera') !== false || strpos($t, 'opr') !== false) return 'Opera';
        if (strpos($t, 'edge') !== false || strpos($t, 'edg') !== false) return 'Edge';
        if (strpos($t, 'chrome') !== false) return 'Chrome';
        if (strpos($t, 'safari') !== false) return 'Safari';
        if (strpos($t, 'firefox') !== false) return 'Firefox';
        return 'Navegador Genérico';
    }

    private function getDeviceName($userAgent) {
        $t = strtolower($userAgent);
        if (strpos($t, 'iphone') !== false) return 'iPhone';
        if (strpos($t, 'ipad') !== false) return 'iPad';
        if (strpos($t, 'android') !== false) return 'Dispositivo Android';
        if (strpos($t, 'windows') !== false) return 'Windows PC';
        if (strpos($t, 'macintosh') !== false) return 'macOS';
        return 'Dispositivo Móvil/Computador';
    }
}
?>
