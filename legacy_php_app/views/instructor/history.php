<?php require_once __DIR__ . '/../layouts/header.php'; ?>

<div class="container">
    <div class="card">
        <div class="panel-header" style="margin-bottom: 20px;">
            <div>
                <h2>Historial de Asistencias Registradas</h2>
                <p class="subtitle">Historial de sesiones dictadas bajo su nombre de instructor</p>
            </div>
            <a href="/instructor/dashboard" class="btn-secondary">Volver al Dashboard</a>
        </div>

        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Fecha / Hora</th>
                        <th>Aprendiz</th>
                        <th>Documento</th>
                        <th>Ficha</th>
                        <th>Estado</th>
                        <th>Horas</th>
                        <th>Excusa</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (count($attendances) === 0): ?>
                        <tr>
                            <td colspan="8" class="empty-table">No se registran asistencias en su historial.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($attendances as $att): ?>
                            <tr>
                                <td><?= htmlspecialchars($att['fecha'] . ' ' . $att['hora'], ENT_QUOTES, 'UTF-8') ?></td>
                                <td><strong><?= htmlspecialchars($att['aprendiz_name'], ENT_QUOTES, 'UTF-8') ?></strong></td>
                                <td><?= htmlspecialchars($att['aprendiz_document'], ENT_QUOTES, 'UTF-8') ?></td>
                                <td><?= htmlspecialchars($att['ficha_code'], ENT_QUOTES, 'UTF-8') ?></td>
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
                                    <div class="action-buttons">
                                        <button onclick="openEditModal(<?= $att['id'] ?>, '<?= $att['estado'] ?>', <?= $att['horas'] ?>)" class="btn-table-edit">Editar</button>
                                        <button onclick="openExcuseModal(<?= $att['id'] ?>)" class="btn-table-excuse">Subir Excusa</button>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Edit Record Modal -->
<div id="editModal" class="modal">
    <div class="modal-content">
        <span class="close-btn" onclick="closeEditModal()">&times;</span>
        <h3>Editar Registro de Asistencia</h3>
        <form id="editForm" onsubmit="submitEdit(event)">
            <?php CSRFHelper::echoInput(); ?>
            <input type="hidden" id="edit_id" name="id">

            <div class="form-group">
                <label for="edit_estado">Estado</label>
                <select id="edit_estado" name="estado" required>
                    <option value="Presente">Presente</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Falta">Falta</option>
                    <option value="Justificado">Justificado</option>
                </select>
            </div>

            <div class="form-group">
                <label for="edit_horas">Horas Registradas</label>
                <input type="number" id="edit_horas" name="horas" min="0" max="12" required>
            </div>

            <button type="submit" class="btn-primary btn-block">Guardar Cambios</button>
        </form>
    </div>
</div>

<!-- Upload Excuse Modal -->
<div id="excuseModal" class="modal">
    <div class="modal-content">
        <span class="close-btn" onclick="closeExcuseModal()">&times;</span>
        <h3>Subir Excusa Médica / Justificación</h3>
        <form action="/instructor/upload-excuse" method="POST" enctype="multipart/form-data">
            <?php CSRFHelper::echoInput(); ?>
            <input type="hidden" id="excuse_attendance_id" name="attendance_id">

            <div class="form-group">
                <label for="excuse_file">Archivo de la Excusa (Formatos permitidos: PDF, JPG, PNG)</label>
                <input type="file" id="excuse_file" name="excuse_file" accept=".pdf,.png,.jpg,.jpeg" required>
            </div>

            <button type="submit" class="btn-primary btn-block">Subir y Justificar Falta</button>
        </form>
    </div>
</div>

<script>
    function openEditModal(id, estado, horas) {
        document.getElementById('edit_id').value = id;
        document.getElementById('edit_estado').value = estado;
        document.getElementById('edit_horas').value = horas;
        document.getElementById('editModal').style.display = 'block';
    }

    function closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
    }

    function openExcuseModal(id) {
        document.getElementById('excuse_attendance_id').value = id;
        document.getElementById('excuseModal').style.display = 'block';
    }

    function closeExcuseModal() {
        document.getElementById('excuseModal').style.display = 'none';
    }

    function submitEdit(e) {
        e.preventDefault();
        const formData = new FormData(document.getElementById('editForm'));

        fetch('/instructor/edit-record', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                window.location.reload();
            } else {
                alert("Error: " + res.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Ocurrió un error al guardar los cambios.");
        });
    }

    // Cerrar modales si se hace clic fuera del contenido
    window.onclick = function(event) {
        const editModal = document.getElementById('editModal');
        const excuseModal = document.getElementById('excuseModal');
        if (event.target === editModal) {
            closeEditModal();
        }
        if (event.target === excuseModal) {
            closeExcuseModal();
        }
    }
</script>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
