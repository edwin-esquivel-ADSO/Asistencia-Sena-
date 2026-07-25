<?php require_once __DIR__ . '/../layouts/header.php'; ?>

<div class="auth-wrapper">
    <div class="auth-card">
        <div class="auth-logo-sena"></div>
        <h2 class="auth-title">Gestión de Asistencia</h2>
        <p class="auth-subtitle">Ingreso para Instructores e Instructores Coordinadores</p>

        <?php if (!empty($error)): ?>
            <div class="alert alert-danger">
                <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
            </div>
        <?php endif; ?>

        <form action="/login" method="POST" class="auth-form" id="loginForm">
            <?php CSRFHelper::echoInput(); ?>

            <div class="form-group">
                <label for="full_name">Nombre Completo</label>
                <input type="text" id="full_name" name="full_name" placeholder="Ej. Carlos Mario Restrepo" required autocomplete="off">
            </div>

            <div class="form-group">
                <label for="document">Número de Documento</label>
                <input type="text" id="document" name="document" placeholder="Ej. 1000200300" required autocomplete="off">
            </div>

            <!-- Legal Privacy Consent Dialog inside Login -->
            <div class="legal-box">
                <h4 class="legal-title">Aviso de Privacidad y Tratamiento de Datos</h4>
                <div class="legal-text">
                    <p>En cumplimiento con la <strong>Constitución Política de Colombia</strong>, la <strong>Ley 1581 de 2012</strong> (Protección de Datos Personales), y el <strong>Decreto 1377 de 2013</strong>, el Servicio Nacional de Aprendizaje (SENA) le informa que recolectará datos de geolocalización, dirección IP, información de dispositivo y navegador para auditar y verificar el registro de asistencia a las sesiones de formación en el marco del derecho de Habeas Data.</p>
                </div>
                <div class="form-checkbox">
                    <input type="checkbox" id="accept_terms" name="accept_terms" required>
                    <label for="accept_terms">Acepto los términos de tratamiento y protección de datos personales.</label>
                </div>
            </div>

            <button type="submit" class="btn-primary btn-block">Ingresar</button>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
