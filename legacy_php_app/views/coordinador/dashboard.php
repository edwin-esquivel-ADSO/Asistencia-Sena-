<?php require_once __DIR__ . '/../layouts/header.php'; ?>

<div class="container-fluid" style="padding: 20px;">
    <div class="card">
        <div class="panel-header" style="margin-bottom: 20px;">
            <div>
                <h2>Panel de Coordinación Académica</h2>
                <p class="subtitle">Consulte todas las asistencias registradas por los instructores a nivel general</p>
            </div>
            <div class="export-options">
                <span class="user-badge font-medium">Rol: Coordinador</span>
            </div>
        </div>

        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Fecha / Hora</th>
                        <th>Ficha</th>
                        <th>Jornada</th>
                        <th>Ambiente</th>
                        <th>Aprendiz</th>
                        <th>Documento</th>
                        <th>Instructor</th>
                        <th>Estado</th>
                        <th>Horas</th>
                        <th>Excusa Adjunta</th>
                        <th>Auditoría / IP</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (count($attendances) === 0): ?>
                        <tr>
                            <td colspan="11" class="empty-table">No hay ningún registro general de asistencias en la base de datos.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($attendances as $att): ?>
                            <tr>
                                <td><?= htmlspecialchars($att['fecha'] . ' ' . $att['hora'], ENT_QUOTES, 'UTF-8') ?></td>
                                <td><strong><?= htmlspecialchars($att['ficha_code'], ENT_QUOTES, 'UTF-8') ?></strong></td>
                                <td><?= htmlspecialchars($att['jornada'], ENT_QUOTES, 'UTF-8') ?></td>
                                <td><small><?= htmlspecialchars($att['ambiente_name'], ENT_QUOTES, 'UTF-8') ?></small></td>
                                <td><strong><?= htmlspecialchars($att['aprendiz_name'], ENT_QUOTES, 'UTF-8') ?></strong></td>
                                <td><?= htmlspecialchars($att['aprendiz_document'], ENT_QUOTES, 'UTF-8') ?></td>
                                <td><?= htmlspecialchars($att['instructor_name'], ENT_QUOTES, 'UTF-8') ?></td>
                                <td>
                                    <span class="badge-status status-<?= strtolower(str_replace(' ', '', $att['estado'])) ?>">
                                        <?= htmlspecialchars($att['estado'], ENT_QUOTES, 'UTF-8') ?>
                                    </span>
                                </td>
                                <td><?= htmlspecialchars($att['horas'], ENT_QUOTES, 'UTF-8') ?> h</td>
                                <td>
                                    <?php if (!empty($att['excuse_path'])): ?>
                                        <a href="<?= htmlspecialchars($att['excuse_path'], ENT_QUOTES, 'UTF-8') ?>" target="_blank" class="btn-text">Ver Excusa</a>
                                    <?php else: ?>
                                        <span class="text-muted">Ninguna</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="ip-info" title="GPS: <?= htmlspecialchars($att['latitud'] . ',' . $att['longitud'], ENT_QUOTES, 'UTF-8') ?> (Precisión: <?= htmlspecialchars($att['precision_gps'], ENT_QUOTES, 'UTF-8') ?>m)">
                                        <?= htmlspecialchars($att['ip_publica'], ENT_QUOTES, 'UTF-8') ?>
                                    </span>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
