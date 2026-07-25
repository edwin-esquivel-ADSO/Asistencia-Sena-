<?php require_once __DIR__ . '/../layouts/header.php'; ?>

<div class="container">
    <div class="dashboard-card">
        <div class="dashboard-header">
            <div>
                <h2>Iniciar Nueva Sesión de Formación</h2>
                <p class="subtitle">Complete los datos para generar el código QR dinámico</p>
            </div>
        </div>

        <?php if (!empty($error)): ?>
            <div class="alert alert-danger"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
        <?php endif; ?>

        <form action="/instructor/dashboard" method="POST" class="standard-form">
            <?php CSRFHelper::echoInput(); ?>

            <div class="form-grid">
                <div class="form-group">
                    <label for="ficha_id">Ficha de Formación</label>
                    <select id="ficha_id" name="ficha_id" required>
                        <option value="">Seleccione una Ficha...</option>
                        <?php foreach ($fichas as $ficha): ?>
                            <option value="<?= $ficha['id'] ?>"><?= htmlspecialchars($ficha['code'] . ' - ' . $ficha['program_name'], ENT_QUOTES, 'UTF-8') ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label for="jornada">Jornada</label>
                    <select id="jornada" name="jornada" required>
                        <option value="">Seleccione Jornada...</option>
                        <option value="Diurna">Diurna</option>
                        <option value="Nocturna">Nocturna</option>
                        <option value="Mixta">Mixta</option>
                        <option value="Madrugada">Madrugada</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="ambiente_id">Ambiente de Aprendizaje</label>
                    <select id="ambiente_id" name="ambiente_id" required>
                        <option value="">Seleccione Ambiente...</option>
                        <?php foreach ($ambientes as $ambiente): ?>
                            <option value="<?= $ambiente['id'] ?>"><?= htmlspecialchars($ambiente['name'], ENT_QUOTES, 'UTF-8') ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label for="duration_minutes">Duración de validez del QR (minutos)</label>
                    <select id="duration_minutes" name="duration_minutes" required>
                        <option value="5">5 Minutos</option>
                        <option value="10">10 Minutos</option>
                        <option value="15" selected>15 Minutos</option>
                        <option value="30">30 Minutos</option>
                        <option value="60">60 Minutos</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="hours_duration">Horas de Formación a Registrar</label>
                    <input type="number" id="hours_duration" name="hours_duration" min="1" max="12" value="6" required>
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn-primary">Generar Código QR de Asistencia</button>
            </div>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
