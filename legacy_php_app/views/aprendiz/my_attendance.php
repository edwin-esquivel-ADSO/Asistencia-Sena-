<?php require_once __DIR__ . '/../layouts/header.php'; ?>

<div class="container" style="max-width: 800px; margin-top: 40px;">
    <div class="card">
        <h2 class="card-title text-center">Consulta de Mi Asistencia</h2>
        <p class="subtitle text-center">Consulte el historial de sus asistencias registradas mediante el código QR</p>

        <form action="/aprendiz/my-attendance" method="GET" class="search-form" style="margin: 20px 0;">
            <div class="form-group flex-row">
                <input type="text" name="document" placeholder="Ingrese su número de documento de identidad..." value="<?= htmlspecialchars($document, ENT_QUOTES, 'UTF-8') ?>" required style="flex: 1;">
                <button type="submit" class="btn-primary">Consultar</button>
            </div>
        </form>

        <?php if ($searched): ?>
            <hr class="divider">
            <h3 style="margin-top: 20px;">Historial de Asistencias para el Documento: <?= htmlspecialchars($document, ENT_QUOTES, 'UTF-8') ?></h3>
            
            <div class="table-container" style="margin-top: 15px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha / Hora</th>
                            <th>Jornada</th>
                            <th>Horas</th>
                            <th>Ambiente</th>
                            <th>Estado</th>
                            <th>Excusa</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (count($attendances) === 0): ?>
                            <tr>
                                <td colspan="6" class="empty-table">No se encontraron registros de asistencias para este documento.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($attendances as $att): ?>
                                <tr>
                                    <td><?= htmlspecialchars($att['fecha'] . ' ' . $att['hora'], ENT_QUOTES, 'UTF-8') ?></td>
                                    <td><?= htmlspecialchars($att['jornada'], ENT_QUOTES, 'UTF-8') ?></td>
                                    <td><?= htmlspecialchars($att['horas'], ENT_QUOTES, 'UTF-8') ?> h</td>
                                    <td><?= htmlspecialchars($att['ambiente_name'], ENT_QUOTES, 'UTF-8') ?></td>
                                    <td>
                                        <span class="badge-status status-<?= strtolower(str_replace(' ', '', $att['estado'])) ?>">
                                            <?= htmlspecialchars($att['estado'], ENT_QUOTES, 'UTF-8') ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?php if (!empty($att['excuse_path'])): ?>
                                            <a href="<?= htmlspecialchars($att['excuse_path'], ENT_QUOTES, 'UTF-8') ?>" target="_blank" class="btn-text">Ver Excusa</a>
                                        <?php else: ?>
                                            <span class="text-muted">Ninguna</span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
