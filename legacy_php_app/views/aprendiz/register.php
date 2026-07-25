<?php require_once __DIR__ . '/../layouts/header.php'; ?>

<div class="auth-wrapper">
    <div class="auth-card" style="max-width: 500px;">
        <div class="auth-logo-sena"></div>
        <h2 class="auth-title">Registro de Asistencia SENA</h2>
        
        <?php if ($session): ?>
            <p class="auth-subtitle">Sesión del Instructor: <strong><?= htmlspecialchars($session['instructor_name'], ENT_QUOTES, 'UTF-8') ?></strong></p>
            <div class="session-meta-tag">
                <span>Ficha: <?= htmlspecialchars($session['ficha_code'], ENT_QUOTES, 'UTF-8') ?></span>
                <span>Ambiente: <?= htmlspecialchars($session['ambiente_name'], ENT_QUOTES, 'UTF-8') ?></span>
            </div>
        <?php endif; ?>

        <?php if (!empty($error)): ?>
            <div class="alert alert-danger">
                <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($success)): ?>
            <div class="alert alert-success">
                <?= htmlspecialchars($success, ENT_QUOTES, 'UTF-8') ?>
            </div>
        <?php else: ?>
            <?php if ($session): ?>
                <form action="/aprendiz/register?token=<?= htmlspecialchars($session['token'], ENT_QUOTES, 'UTF-8') ?>" method="POST" class="auth-form" id="registerForm" onsubmit="return validateAndSubmit(event)">
                    <?php CSRFHelper::echoInput(); ?>

                    <!-- Geolocalización oculta -->
                    <input type="hidden" id="latitud" name="latitud" value="Ubicación no disponible">
                    <input type="hidden" id="longitud" name="longitud" value="Ubicación no disponible">
                    <input type="hidden" id="precision_gps" name="precision_gps" value="Ubicación no disponible">

                    <div class="form-group">
                        <label for="full_name">Nombre Completo</label>
                        <input type="text" id="full_name" name="full_name" placeholder="Ej. Juan Pérez" required>
                    </div>

                    <div class="form-group">
                        <label for="document">Número de Documento</label>
                        <input type="text" id="document" name="document" placeholder="Ej. 10203040" required>
                    </div>

                    <div class="gps-disclaimer" id="gps-status-box">
                        <span class="icon">📍</span>
                        <span id="gps-status-text">Solicitando acceso a su ubicación GPS...</span>
                    </div>

                    <button type="submit" class="btn-primary btn-block" id="btnSubmit">Confirmar Asistencia</button>
                </form>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</div>

<script>
    document.addEventListener("DOMContentLoaded", function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    document.getElementById('latitud').value = position.coords.latitude;
                    document.getElementById('longitud').value = position.coords.longitude;
                    document.getElementById('precision_gps').value = position.coords.accuracy;
                    
                    const statusBox = document.getElementById('gps-status-box');
                    if (statusBox) {
                        statusBox.className = "gps-disclaimer gps-success";
                        document.getElementById('gps-status-text').innerText = "Ubicación GPS obtenida con éxito.";
                    }
                },
                function(error) {
                    console.warn("Error de geolocalización: ", error.message);
                    const statusBox = document.getElementById('gps-status-box');
                    if (statusBox) {
                        statusBox.className = "gps-disclaimer gps-warning";
                        document.getElementById('gps-status-text').innerText = "Ubicación no disponible. Puede registrarse sin GPS.";
                    }
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            const statusBox = document.getElementById('gps-status-box');
            if (statusBox) {
                statusBox.className = "gps-disclaimer gps-warning";
                document.getElementById('gps-status-text').innerText = "Geolocalización no soportada por su navegador.";
            }
        }
    });

    function validateAndSubmit(e) {
        document.getElementById('btnSubmit').disabled = true;
        document.getElementById('btnSubmit').innerText = "Registrando...";
        return true;
    }
</script>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
