<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Gestión de Asistencia SENA</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body>
    <header class="main-header">
        <div class="header-container">
            <div class="brand">
                <div class="sena-logo"></div>
                <div class="brand-text">
                    <h1>SENA</h1>
                    <span class="sub-brand">Gestión de Asistencia</span>
                </div>
            </div>
            <nav class="nav-menu">
                <?php if (isset($_SESSION['user'])): ?>
                    <span class="user-greeting">Hola, <strong><?= htmlspecialchars($_SESSION['user']['full_name'], ENT_QUOTES, 'UTF-8') ?></strong></span>
                    <?php if ($_SESSION['user']['role'] === 'instructor'): ?>
                        <a href="/instructor/dashboard" class="nav-link">Inicio</a>
                        <a href="/instructor/history" class="nav-link">Historial</a>
                    <?php elseif ($_SESSION['user']['role'] === 'coordinador'): ?>
                        <a href="/coordinador/dashboard" class="nav-link">Historial General</a>
                    <?php endif; ?>
                    <a href="/logout" class="btn-logout">Cerrar Sesión</a>
                <?php else: ?>
                    <a href="/aprendiz/my-attendance" class="nav-link">Mi Asistencia (Aprendiz)</a>
                    <a href="/login" class="btn-login-header">Acceso Empleados</a>
                <?php endif; ?>
            </nav>
        </div>
    </header>
    <main class="main-content">
