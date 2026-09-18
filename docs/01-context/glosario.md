# 01 — Glosario del Dominio (Glossary)
## Sistema de Gestión de Asistencia SENA

Este documento define la terminología institucional y técnica utilizada en el sistema de gestión de asistencia del Servicio Nacional de Aprendizaje (SENA).

---

### Términos Institucionales SENA

| Término | Definición |
|---|---|
| **Aprendiz** | Estudiante matriculado en un programa de formación titulada o complementaria en el SENA. Es el sujeto pasivo del registro de asistencia. |
| **Instructor** | Docente o facilitador pedagógico a cargo del proceso formativo en un ambiente de aprendizaje. Administra las sesiones de asistencia. |
| **Coordinador Académico** | Directivo docente encargado de supervisar múltiples programas de formación, instructores y resolver solicitudes de excusas multidía. |
| **Ficha de Formación** | Código numérico identificador único asignado a un grupo de aprendices pertenecientes a un mismo programa y cohorte (ej. Ficha `3413974`). |
| **Programa de Formación** | Plan curricular oficial estructurado por competencias laborales (ej. *Análisis y Desarrollo de Software - ADSO*). |
| **Ambiente de Aprendizaje** | Espacio físico (aula, taller o laboratorio) o virtual donde se desarrollan las actividades pedagógicas formativas. |
| **Jornada** | Franja horaria reglamentaria en la que se imparten las clases: `Diurna`, `Tarde`, `Nocturna`, `Mixta`. |
| **Motivo de Retiro** | Catálogo cerrado institucional para registrar el cese temporal o definitivo de un aprendiz: `Deserción`, `Traslado`, `Cancelación de matrícula`, `Retiro voluntario`, `Otro`. |

---

### Términos de Asistencia y Flujos de Negocio

| Término | Definición |
|---|---|
| **Sesión QR Principal** | Registro de clase temporal activo generado por el instructor, cuya vigencia estándar es de exactamente 5 minutos desde su creación. |
| **Token Rotativo (HMAC)** | Valor criptográfico que cambia cada 30 segundos mediante HMAC-SHA256 para evitar capturas de pantalla o reenvío remoto del código QR entre aprendices ausentes. |
| **QR para Tardíos (Late QR)** | Código QR secundario generado opcionalmente por el instructor para aprendices rezagados, habilitado únicamente dentro de una ventana máxima de 10 minutos post-expiración. |
| **Ventana de Gracia Extemporánea** | Periodo estricto de máximo 10 minutos a partir de `expires_at` en el cual el sistema permite aperturas tardías. Superado este tiempo, la sesión queda sellada irreversiblemente. |
| **Excusa Unidía** | Justificación médica o laboral que abarca exactamente 1 jornada/día calendario. Su revisión y aprobación recae directamente en el instructor de la sesión. |
| **Excusa Multidía** | Justificación que comprende dos (2) o más días consecutivos. Su trámite requiere aprobación centralizada del Coordinador y genera notificaciones en abanico (*fan-out*) a todos los instructores vinculados. |
| **Bloqueo Optimista (Version)** | Mecanismo de control de concurrencia en base de datos basado en un número incremental `version` para evitar colisiones de decisión simultánea entre usuarios. |

---

### Términos Técnicos y Biometría

| Término | Definición |
|---|---|
| **Descriptor Biométrico (Vector 128D)** | Arreglo unidimensional de 128 números flotantes (`Float32Array` / `FLOAT8[]`) generado por una red neuronal convolucional (FaceNet / MobileNet) que sintetiza los rasgos faciales únicos del aprendiz. |
| **Distancia Euclidiana** | Métrica matemática para comparar dos descriptores faciales en un espacio euclidiano de 128 dimensiones: $d(u,v) = \sqrt{\sum (u_i - v_i)^2}$. Valores inferiores a `0.55` se consideran coincidencia biométrica positiva. |
| **Inferencia en el Cliente** | Procesamiento de la red neuronal directamente en el navegador del aprendiz mediante `@vladmandic/face-api`, eliminando la carga computacional en el backend serverless. |
| **URL Firmada (Cloudinary)** | Enlace HTTPS autenticado y efímero con expiración forzada (TTL de 300 segundos) para visualizar de forma segura soportes y actas adjuntas sin exponer recursos públicos. |
