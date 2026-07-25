<?php require_once __DIR__ . '/../layouts/header.php'; ?>

<div class="container">
    <div class="session-grid">
        <!-- QR Code Display Panel -->
        <div class="card card-qr-panel">
            <h3>Código QR de Registro de Asistencia</h3>
            <p class="qr-info-text">Los aprendices deben escanear este código con sus teléfonos celulares.</p>
            
            <div id="qrcode-container" class="qrcode-wrapper">
                <!-- El código QR se dibuja dinámicamente aquí -->
            </div>
            
            <div class="session-countdown">
                Tiempo restante para escanear: <span id="countdown">Calculando...</span>
            </div>

            <div class="session-meta-summary">
                <p><strong>Ficha:</strong> <?= htmlspecialchars($activeSession['ficha_code'] . ' - ' . $activeSession['program_name'], ENT_QUOTES, 'UTF-8') ?></p>
                <p><strong>Ambiente:</strong> <?= htmlspecialchars($activeSession['ambiente_name'], ENT_QUOTES, 'UTF-8') ?></p>
                <p><strong>Jornada:</strong> <?= htmlspecialchars($activeSession['jornada'], ENT_QUOTES, 'UTF-8') ?></p>
                <p><strong>Horas Planificadas:</strong> <?= htmlspecialchars($activeSession['hours_duration'], ENT_QUOTES, 'UTF-8') ?> horas</p>
            </div>

            <form action="/instructor/finish-session" method="POST" class="finish-session-form">
                <?php CSRFHelper::echoInput(); ?>
                <button type="submit" class="btn-danger btn-block">Finalizar Sesión y Guardar Horas</button>
            </form>
        </div>

        <!-- Real-time Attendance List Panel -->
        <div class="card card-list-panel">
            <div class="panel-header">
                <h3>Aprendices Registrados en Tiempo Real</h3>
                <span class="badge" id="attendees-count">0 Registros</span>
            </div>
            
            <div class="table-container">
                <table class="data-table" id="attendances-table">
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Aprendiz</th>
                            <th>Documento</th>
                            <th>Ubicación / GPS</th>
                            <th>Dispositivo</th>
                        </tr>
                    </thead>
                    <tbody id="attendances-tbody">
                        <tr>
                            <td colspan="5" class="empty-table">Esperando registros de aprendices...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Load QRCode library from static file / asset, or CDN fallback inside public assets -->
<script src="/assets/js/qrcode.min.js"></script>
<script>
    document.addEventListener("DOMContentLoaded", function() {
        // Token del QR y expiración desde PHP
        const token = "<?= $activeSession['token'] ?>";
        const expiresAtStr = "<?= $activeSession['expires_at'] ?>";
        const expiresAt = new Date(expiresAtStr.replace(/-/g, "/")).getTime();

        // Generar enlace completo para el QR
        const registerUrl = window.location.origin + "/aprendiz/register?token=" + token;

        // Generar el QR
        try {
            new QRCode(document.getElementById("qrcode-container"), {
                text: registerUrl,
                width: 256,
                height: 256,
                colorDark: "#39A900",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch(e) {
            console.error("Error al inicializar QRCode.js", e);
            document.getElementById("qrcode-container").innerHTML = `<p class="error-msg">No se pudo cargar el QR directamente, enlace: <a href="${registerUrl}">${registerUrl}</a></p>`;
        }

        // Cuenta regresiva
        const countdownElement = document.getElementById("countdown");
        const timer = setInterval(function() {
            const now = new Date().getTime();
            const distance = expiresAt - now;

            if (distance < 0) {
                clearInterval(timer);
                countdownElement.innerHTML = "EXPIRADO";
                countdownElement.style.color = "red";
            } else {
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                countdownElement.innerHTML = minutes + "m " + seconds + "s";
            }
        }, 1000);

        // Polling en tiempo real cada 3 segundos
        const tbody = document.getElementById("attendances-tbody");
        const countBadge = document.getElementById("attendees-count");

        function fetchAttendances() {
            fetch("/instructor/active-attendances-poll")
                .then(response => response.json())
                .then(res => {
                    if (res.status === 'inactive') {
                        window.location.href = "/instructor/dashboard";
                        return;
                    }

                    if (res.data && res.data.length > 0) {
                        countBadge.innerText = res.data.length + " Registros";
                        let html = '';
                        res.data.forEach(att => {
                            html += `
                                <tr>
                                    <td>${att.hora}</td>
                                    <td><strong>${att.aprendiz_name}</strong></td>
                                    <td>${att.aprendiz_document}</td>
                                    <td>
                                        <div class="gps-badge">
                                            <span>GPS: ${att.latitud}, ${att.longitud}</span>
                                            <small>Precisión: ${att.precision_gps} m</small>
                                        </div>
                                    </td>
                                    <td><small>${att.dispositivo} - ${att.navegador}</small></td>
                                </tr>
                            `;
                        });
                        tbody.innerHTML = html;
                    } else {
                        countBadge.innerText = "0 Registros";
                        tbody.innerHTML = `<tr><td colspan="5" class="empty-table">Esperando registros de aprendices...</td></tr>`;
                    }
                })
                .catch(err => console.error("Error al actualizar la lista de asistencia:", err));
        }

        // Cargar inmediatamente e iniciar polling
        fetchAttendances();
        setInterval(fetchAttendances, 3000);
    });
</script>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
