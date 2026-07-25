<?php
// app/helpers/CSRFHelper.php

class CSRFHelper {
    public static function init() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
    }

    public static function getToken() {
        self::init();
        return $_SESSION['csrf_token'];
    }

    public static function validate($token) {
        self::init();
        if (isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token)) {
            return true;
        }
        return false;
    }

    public static function echoInput() {
        $token = self::getToken();
        echo '<input type="hidden" name="csrf_token" value="' . htmlspecialchars($token, ENT_QUOTES, 'UTF-8') . '">';
    }
}
