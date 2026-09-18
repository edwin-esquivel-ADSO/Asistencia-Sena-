# Documento de Descubrimiento — Sistema de Asistencia SENA
## Versión 3.0 | Fecha: 2026-08-22 | Equipo: MercaGo Full Stack

---

## 01-contexto

### 1.1 Visión
El Sistema de Asistencia SENA busca digitalizar, automatizar y proteger el proceso de asistencia de aprendices del SENA, reemplazando la toma de lista manual por un flujo web seguro, escalable y trazable. El sistema debe permitir a los aprendices registrar asistencia con validación biométrica, a los instructores supervisar sesiones en tiempo real y a los coordinadores gestionar excusas y retiros con control de autoridad.

### 1.2 Problema de negocio
El proceso de asistencia tradicional basado en papel y listas manuales presenta fallas operativas y de control:
- ausencia de validación real de identidad,
- riesgo de asistencia fraudulenta con QR compartido o uso indebido de credenciales,
- dificultad para auditar inasistencias y excusas,
- baja visibilidad en tiempo real para el instructor,
- gestión inconsistente de excusas dependiendo del tipo de falta.

### 1.3 Contexto tecnológico y organizacional
El proyecto moderniza un sistema legado implementado en PHP bajo una arquitectura MVC en `legacy_php_app/`, con limitaciones de acoplamiento, falta de tipado, dificultades para render en tiempo real y poca compatibilidad con un despliegue serverless en Vercel. Como respuesta, se adopta una solución construida con Next.js, TypeScript, React y PostgreSQL, con la intención de mantener la lógica de negocio centralizada y separada por roles y flujos.

### 1.4 Principales actores del sistema

| Actor | Rol principal | Necesidad clave |
|-------|---------------|----------------|
| Aprendiz | Marca asistencia y valida identidad | Registrar presencia de forma segura y rápida |
| Instructor | Crea sesiones y supervisa la clase | Controlar asistencia en vivo y revisar excusas unidía |
| Coordinador | Gestiona fichas y excusas multidía | Resolver casos complejos y auditar decisiones |
| Sistema | Valida QR, biometría, permisos y reglas | Proteger la integridad del registro |

### 1.5 Objetivos del negocio
1. Sustituir la asistencia manual por un flujo digital con validación de identidad.
2. Reducir fraude en la asistencia mediante QR temporal y comprobación facial.
3. Aumentar la trazabilidad de las faltas, excusas y retiros.
4. Diferenciar claramente los flujos de excusa por tipo y autoridad responsable.
5. Permitir la operación en una infraestructura serverless con alta disponibilidad y seguridad.

### 1.6 Alcance del MVP
Incluye:
- autenticación por roles,
- creación de sesiones QR por instructor,
- registro de asistencia con QR y verificación facial,
- control de asistencia en tiempo real,
- gestión de excusas unidía y multidía,
- revisión de evidencias con acceso firmado,
- historial de asistencia y consulta por actividad.

No está dentro del MVP inicial:
- notificaciones push móviles,
- integraciones con sistemas externos del SENA,
- analítica avanzada de desempeño,
- WebSockets persistentes para notificaciones en tiempo real.

### 1.7 Glosario operativo
- QR session: sesión activa de asistencia vinculada a una ficha, ambiente y jornada.
- Biometría facial: comparación del rostro actual con un descriptor previamente registrado.
- Excusa unidía: ausencia puntal resuelta por el instructor responsable.
- Excusa multidía: ausencia prolongada que requiere resolución coordinada y escalada.
- Ficha: conjunto de aprendices pertenecientes a un programa de formación.

### 1.8 Alineación con ADRs
Las decisiones de arquitectura que sostienen este descubrimiento están formalizadas en los ADRs del proyecto:
- ADR-001: migración del monolito PHP a Next.js + TypeScript.
- ADR-002: verificación biométrica facial.
- ADR-003: QR dinámico con validación temporal.
- ADR-004: evidencia protegida con URLs firmadas en Cloudinary.
- ADR-005: reestructuración modular del repositorio.
- ADR-006: optimización biométrica con almacenamiento vectorial.
- ADR-007: sincronización en tiempo real para sesiones activas.
- ADR-008: control de concurrencia para excusas.
- ADR-009: flujo diferenciado para excusas unidía y multidía.

---

## 02-domain

### 2.1 Modelo de dominio
El núcleo del dominio es la gestión de la asistencia académica. El proceso se estructura alrededor de sesiones, aprendices, instructores, coordinadores, fichas y excusas.

Entidades principales:
- Usuario
- Rol
- Ficha
- Ambiente
- Sesión QR
- Asistencia
- Aprendiz
- Excusa
- Retiro o baja académica

### 2.2 Entidades y responsabilidades

#### Usuario
Toda persona autenticada en el sistema. Puede ser aprendiz, instructor o coordinador. La identidad se valida mediante documento y contraseña, y en algunos flujos también por verificación facial.

#### Ficha
Unidad de agrupación académica que concentra aprendices y sesiones. Está asociada con instructores y ambientes.

#### Sesión QR
Instancia de clase abierta por un instructor para marcar presencia. Tiene token, duración, estado, ficha, ambiente y jornada.

#### Asistencia
Registro individual generado cuando el aprendiz valida su identidad y presencia en una sesión activa.

#### Excusa
Solicitud enviada por un aprendiz para justificar una ausencia. Su tratamiento depende del tipo y del rol encargado de resolverla.

### 2.3 Eventos clave del dominio
- Instructor crea una sesión de asistencia.
- Aprendiz escanea el QR de la sesión.
- Aprendiz realiza verificación facial.
- Sistema valida identidad y registra asistencia.
- Aprendiz presenta una excusa.
- Instructor resuelve excusa unidía.
- Coordinador resuelve excusa multidía.
- Instructor cierra sesión y consolida datos.

### 2.4 Reglas de negocio principales
1. La asistencia solo puede registrarse en una sesión activa y vigente.
2. El QR de la sesión debe rotar por tiempo para invalidar reproducción o reuso.
3. La verificación facial es un segundo factor de identidad antes de confirmar asistencia.
4. No puede existir más de un registro de asistencia para el mismo aprendiz en la misma sesión.
5. Las excusas deben ser resueltas por la autoridad correcta según la duración de la ausencia.
6. La evidencia de cada excusa debe quedar protegida y accesible solo con autorización.
7. Los eventos deben conservar trazabilidad de fecha, hora, dispositivo e IP.

### 2.5 Relaciones relevantes
- Un instructor puede tener varias fichas asignadas.
- Una ficha puede tener muchos aprendices y varias sesiones.
- Una sesión puede contener múltiples asistencias.
- Un aprendiz puede generar varias excusas durante el periodo académico.
- El mismo caso puede implicar varios instructores cuando la ausencia es multidía.

### 2.6 Relación con los ADRs del dominio
- ADR-003 define la seguridad del QR y el margen extemporáneo.
- ADR-009 establece el flujo diferenciado para excusas unidía y multidía.
- ADR-008 aborda cómo evitar conflictos concurrentes cuando dos actores resuelven la misma excusa.
- ADR-002 define la verificación biométrica del aprendiz.

---

## 03-product

### 3.1 Visión del producto
Crear una solución digital confiable para la gestión de asistencia en SENA, centrada en seguridad, trazabilidad y flujo claro de decisiones. La plataforma debe simplificar la toma de lista, proteger la integridad del registro y ofrecer información útil a cada rol del proceso educativo.

### 3.2 Propuesta de valor
- El instructor reduce tiempo y errores en la toma de lista.
- El aprendiz realiza una validación segura y rápida de presencia.
- El coordinador tiene mejor control de ausencias, excusas y casos complejos.
- La institución obtiene registros más confiables, defensables y auditable.

### 3.3 MVP y alcance funcional
El MVP incluye:
- autenticación por roles,
- generación de sesiones QR,
- verificación facial para asistencia,
- control de asistencias activas,
- excusas con diferenciación por tipo,
- panel del instructor con actualización en vivo,
- consulta de historial y manejo de evidencias.

### 3.4 Backlog priorizado
#### Prioridad alta
- Login y autenticación diferenciada por rol.
- Creación de sesión con ficha, ambiente y jornada.
- QR dinámico temporal y válido por ventana corta.
- Verificación biométrica antes de confirmar asistencia.
- Registro de asistencia y bloqueo de duplicados.
- Gestión de excusas unidía y multidía.

#### Prioridad media
- Historial de asistencias y consultas de evolución.
- Panel del instructor con revalidación reactiva.
- Tratamiento de retirados y motivos estandarizados.
- Consulta documental asociada a excusas y evidencias.

#### Prioridad baja
- Integraciones externas,
- reportes avanzados,
- notificaciones push,
- analítica de rendimiento académico.

### 3.5 Historias de usuario

#### Como instructor
- Quiero crear una sesión para cada clase.
- Quiero ver quién ya asistió sin recargar la página.
- Quiero aprobar excusas unidía con claridad y sin duplicidad de decisiones.

#### Como aprendiz
- Quiero iniciar sesión con mi documento y contraseña.
- Quiero escanear el QR y verificar mi identidad con rostro.
- Quiero consultar mi historial y excusas justificadas.

#### Como coordinador
- Quiero revisar y resolver excusas multidía.
- Quiero gestionar fichas, retirados y casos complejos.
- Quiero asegurar que el historial de asistencia sea consistente y verificable.

### 3.6 Restricciones del producto
- Debe operar en un entorno serverless basado en Vercel.
- Debe usar PostgreSQL como base de datos principal.
- Debe manejar archivos de evidencia con Cloudinary.
- Debe cumplir con principios de seguridad, trazabilidad y privacidad.

### 3.7 Alineación con ADRs del producto
- ADR-001 define la base tecnológica y la migración del monolito.
- ADR-005 define la estructura modular del repositorio para sostener este producto.
- ADR-007 define cómo se hace la sincronización en tiempo real del panel del instructor.
- ADR-004 define cómo se entrega la evidencia documental sin exponer archivos sensibles.

---

## 04-requisitos

### 4.1 Requisitos funcionales

#### RF-01: Autenticación y roles
El sistema debe permitir el acceso diferenciado para aprendiz, instructor y coordinador mediante documento y contraseña.

#### RF-02: Generación de sesión
El instructor debe poder crear una sesión de asistencia asociada a ficha, ambiente, jornada y duración.

#### RF-03: QR dinámico y seguro
El sistema debe generar un QR temporal con token rotativo y límite de expiración para evitar uso fraudulento fuera del aula.

#### RF-04: Registro de asistencia
El aprendiz debe poder registrar asistencia validando identidad mediante escaneo QR y verificación facial.

#### RF-05: Prevención de duplicados
No se debe permitir más de un registro de asistencia por persona dentro de la misma sesión activa.

#### RF-06: Gestión de excusas
El sistema debe soportar excusas unidía y multidía con flujo de resolución y visualización apropiados para cada caso.

#### RF-07: Historial y consulta
El sistema debe permitir consultar asistencias, inasistencias y excusas por aprendiz, instructor o ficha.

#### RF-08: Evidencia documental
Las evidencias adjuntas a excusas deben almacenarse y entregarse mediante acceso temporal y firmado.

#### RF-09: Control de concurrencia
Cuando dos actores resuelven la misma excusa casi simultáneamente, el sistema debe proteger la coherencia del estado mediante control de versiones.

### 4.2 Requisitos no funcionales

#### RNF-01: Seguridad
- Uso de cookies HttpOnly y tokens firmados para autenticación.
- Validación por roles y permisos en rutas sensibles.
- Hash seguro de contraseñas.
- Protección de claves y secretos en variables de entorno.

#### RNF-02: Rendimiento
- Optimización de la verificación facial para reducir latencia y consumo de CPU.
- Actualización del panel del instructor sin recarga completa y con polling reactivo.

#### RNF-03: Confiabilidad
- Las operaciones deben ser consistentes ante errores de validación o actualizaciones concurrentes.
- La lógica de negocio debe impedir estados inconsistentes o sobreescrituras accidentales.

#### RNF-04: Escalabilidad
- La solución debe soportar crecimiento en número de aprendices y sesiones.
- La arquitectura debe permanecer compatible con el modelo serverless de Vercel.

#### RNF-05: Privacidad y trazabilidad
- Conservar información de operación como IP, dispositivo, navegador y fecha/hora.
- Garantizar acceso temporal a evidencias para evitar exposición innecesaria.

#### RNF-06: Usabilidad
- El flujo debe ser claro para usuarios con baja familiaridad digital.
- Debe existir retroalimentación visual clara en errores, carga y confirmaciones.

### 4.3 Restricciones técnicas
- Stack principal: Next.js 14, TypeScript, React 18, Tailwind CSS.
- Base de datos: PostgreSQL con `pg` Pool.
- Infraestructura: Vercel + serverless functions.
- Almacenamiento: Cloudinary para evidencias y activos digitales.
- Seguridad: JWT, cookies HttpOnly, cifrado y firmas HMAC para QR y archivos.

### 4.4 Criterios de aceptación del MVP
- Un aprendiz puede iniciar sesión y registrar asistencia validando QR y rostro.
- Un instructor puede crear una sesión y ver el estado de asistentes en tiempo real.
- Un coordinador puede gestionar y resolver excusas multidía.
- El sistema bloquea o rechaza intentos de fraude de asistencia.
- Las evidencias y los registros quedan trazados y protegidos.

---

## Conclusión
El descubrimiento del proyecto y los ADRs son coherentes entre sí: el discovery describe la necesidad de negocio, los actores, el dominio y los requisitos; los ADRs explican las decisiones técnicas que permiten cumplir esos objetivos. La arquitectura final toma una posición clara: Next.js + TypeScript para la aplicación, PostgreSQL para persistencia, Cloudinary para evidencias, QR rotativo y biometría para seguridad, y reglas de flujo diferenciadas para excusas según la complejidad del caso. Esta combinación permite construir un sistema seguro, auditable y operativo en un contexto académico real.
- Un instructor puede crear una sesión y ver la lista de asistentes en vivo.
- Un coordinador puede revisar y resolver excusas multidía.
- El sistema bloquea o rechaza intentos de fraude de asistencia.
- Los datos de asistencia quedan trazados y auditable.

---

## Conclusión
El proyecto responde a una necesidad clara del entorno educativo: digitalizar la asistencia de aprendices de forma segura, verificable y operable para múltiples roles. La estructura propuesta mantiene la simplicidad del proceso, pero incorpora controles de seguridad y trazabilidad que el sistema anterior no tenía. La organización del discovery en cuatro bloques principales — contexto, dominio, producto y requisitos — permite que el proyecto quede bien definido para diseño, desarrollo y validación.

**Solución implementada:**  
- Catálogo cerrado de motivos obligatorios: `Deserción`, `Traslado`, `Cancelación de matrícula`, `Retiro voluntario`.
- Campo adicional `notas_retiro` opcional (texto libre) habilitado únicamente al seleccionar `Otro`.
- Validación en backend: el campo `motivo_retiro` debe pertenecer al catálogo permitido.

---

### Hallazgo #007 — Navegación Responsive en Dispositivos Móviles
**Categoría:** Feature / UX  
**Tipo:** No-ADR  

**Problema identificado:**  
La barra de navegación horizontal generaba desbordamiento (`overflow-x`) y layouts rotos en viewports de 320–768 px, impidiendo el acceso a secciones del sistema desde dispositivos móviles.

**Solución implementada:**  
- Componente de navegación con drawer lateral activado por botón hamburguesa en viewports `< md` (Tailwind breakpoint: `768 px`).
- Breakpoints explícitos con clases Tailwind (`hidden md:flex`, `flex md:hidden`).
- Menú drawer con cierre por clic en overlay o en enlace de navegación.

---

### Hallazgo #008 — Filtros de Estado en el Panel de Asistencia
**Categoría:** Feature / UX  
**Tipo:** No-ADR  

**Problema identificado:**  
Las tarjetas de aprendiz en el panel de asistencia del instructor contenían botones de filtro de estado (P/T/J/F). Al hacer clic en un filtro, el evento de clic se propagaba al contenedor padre de la tarjeta, colapsando accidentalmente el acordeón del aprendiz.

**Solución implementada:**  
- `event.stopPropagation()` en los manejadores de clic de los botones de filtro de estado.
- Separación explícita de la zona clickeable de la tarjeta (collapse trigger) y la zona de acción (filtros de estado).

---

### Hallazgo #009 — Inicio de Sesión del Instructor
**Categoría:** Feature / Autenticación  
**Tipo:** No-ADR  

**Problema identificado:**  
El campo de identificación del login no era claro respecto a si se esperaba cédula, usuario o email, retrasando el inicio de sesión y generando confusión entre instructores con experiencia técnica limitada.

**Solución implementada:**  
- Login unificado mediante **número de documento de identidad** como identificador primario.
- Contraseña validada con `bcryptjs.compare()` contra el hash almacenado en BD.
- JWT firmado (`jsonwebtoken`) con expiración 12 h, almacenado en cookie `sena_session` (HttpOnly, Secure).
- Mensajes de error genéricos ("Credenciales incorrectas") para no revelar si el documento existe o no.

---

### Hallazgo #010 — Servido Seguro de Evidencias (Excusas)
**Categoría:** Arquitectura  
**Tipo:** ADR-004  

**Problema identificado:**  
Los archivos adjuntos de excusas (certificados médicos, permisos) almacenados en Cloudinary retornaban errores:
- **HTTP 403 Forbidden:** Recursos configurados como `authenticated` accedidos con URL pública sin firma.
- **HTTP 404 Not Found:** URLs estáticas almacenadas en BD apuntando a versiones obsoletas del `public_id` tras reorganizaciones de carpetas en Cloudinary.

Las URLs públicas también permitían acceso no autorizado a documentos médicos sensibles.

**Solución implementada (ADR-004):**  
- La columna `attendances.excuse_path` almacena únicamente el `public_id` estable de Cloudinary (no la URL completa).
- El backend genera URLs firmadas temporales en tiempo de consulta usando `cloudinary.url(publicId, { type: 'authenticated', sign_url: true, expires_at: now + 300 })`.
- TTL de 5 minutos por URL firmada.
- La firma se genera con `CLOUDINARY_API_SECRET` almacenado exclusivamente en variables de entorno del servidor.
- Función implementada en `src/lib/cloudinary.ts`: `getSignedImageUrl(publicId, expiresInSeconds = 300)`.

---

### Hallazgo #011 — Vinculación de Excusa a Ficha Académica
**Categoría:** Feature / Dominio  
**Tipo:** No-ADR  

**Problema identificado:**  
Las excusas se registraban sin vincularlas explícitamente a la ficha (programa de formación) correspondiente del aprendiz, imposibilitando el filtrado por programa y generando ambigüedad cuando un aprendiz pertenecía a más de una ficha.

**Solución implementada:**  
- Durante la creación de una excusa, se requiere la selección obligatoria del `ficha_id` activo asociado al aprendiz.
- El campo `ficha_id` se vincula a la tabla `fichas` y a la relación `instructor_fichas` para enrutamiento correcto al instructor responsable.
- Validación backend: el `ficha_id` proporcionado debe pertenecer a la lista de fichas activas del aprendiz.

---

### Hallazgo #012 — Flujo Diferenciado: Excusa Unidía vs. Multidía
**Categoría:** Arquitectura  
**Tipo:** ADR-009  

**Problema identificado:**  
Todas las excusas (independientemente de la duración) se enrutaban al mismo buzón sin distinción de autoridad de resolución. Esto sobrecargaba al coordinador con excusas de un solo día que deberían resolverse directamente entre aprendiz e instructor.

**Solución implementada (ADR-009):**  

**Tipo 1 — Excusa Unidía (`fecha_inicio == fecha_fin`):**
- Enrutamiento directo al instructor responsable de la sesión del día afectado.
- El instructor aprueba o rechaza desde su panel.
- `attendance.estado` se actualiza a `Justificado` tras aprobación.

**Tipo 2 — Excusa Multidía (`fecha_fin > fecha_inicio`, ≥ 2 días):**
- Enrutamiento al coordinador como autoridad de resolución primaria.
- Fan-out de notificaciones a todos los instructores con sesiones en el rango de fechas afectado.
- El coordinador aprueba o rechaza globalmente.
- El sistema actualiza `excuse_status` en todos los registros del rango.

**Columna `tipo` generada automáticamente en PostgreSQL:**
```sql
tipo VARCHAR(10) GENERATED ALWAYS AS (
  CASE WHEN fecha_fin > fecha_inicio THEN 'multidía' ELSE 'unidía' END
) STORED
```

---

### Hallazgo #013 — Control de Concurrencia en Aprobación de Excusas
**Categoría:** Arquitectura  
**Tipo:** ADR-008  

**Problema identificado:**  
Cuando el coordinador y el instructor visualizaban y actuaban sobre la misma excusa simultáneamente desde diferentes dispositivos, la segunda escritura sobreescribía silenciosamente a la primera, produciendo un estado final indeterminado (race condition).

**Solución implementada (ADR-008) — Bloqueo Optimista:**  
- Campo `version INT NOT NULL DEFAULT 1` agregado a `excuse_requests`; no existe un contador paralelo en `attendances`.
- El cliente siempre incluye el `version` actual al enviar una actualización (`PATCH /api/excusas/[id]`).
- El Route Handler ejecuta: `UPDATE excuse_requests SET version = version + 1 WHERE id = $1 AND version = $2 AND status = 'pending' RETURNING id` dentro de una transacción.
- Si `0 filas afectadas` → conflicto de versión → HTTP `409 Conflict` con mensaje descriptivo.
- El cliente muestra toast de error e invita al usuario a recargar el estado actual.
- Sin bloqueos pesimistas (`SELECT FOR UPDATE`): no hay riesgo de deadlocks.

---

### Hallazgo #014 — Estados Activo/Inactivo de Aprendices
**Categoría:** Feature / Dominio  
**Tipo:** No-ADR  

**Problema identificado:**  
Los aprendices dados de baja (retirados, trasladados) aparecían en las listas operativas diarias de asistencia, contaminando los reportes y confundiendo a los instructores durante el pase de lista.

**Solución implementada:**  
- Los aprendices con `is_active = false` se excluyen por defecto de las listas operativas de asistencia (`WHERE is_active = TRUE`).
- El historial y los reportes incluyen un filtro explícito para mostrar aprendices inactivos cuando se requiere auditoría.
- El flujo de reactivación de un aprendiz requiere autorización del coordinador y genera un registro de auditoría.

---

### Hallazgo #015 — Formato de Fechas en la UI de Excusas
**Categoría:** Feature / UX  
**Tipo:** No-ADR  

**Problema identificado:**  
Las fechas se mostraban como timestamps ISO completos (`2026-08-12T00:00:00.000Z`), resultando en cadenas largas y confusas para usuarios no técnicos en los paneles de excusas.

**Solución implementada:**  
- Formato compacto colombiano para fecha única: `12 ago. 2026`.
- Formato de rango para excusas multidía: `12–15 ago. 2026`.
- Todas las conversiones usan zona horaria `America/Bogota` mediante `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' })`.
- Implementado en `src/lib/date-utils.ts` con las funciones `formatDateBogota()` y `formatTimeBogota()`.

---

## 7. Matriz de Requisitos

### 7.1 Requisitos Funcionales (RF)

| ID | Requisito | Hallazgo | ADR |
|----|-----------|----------|-----|
| RF-001 | Autenticación por documento + contraseña (bcryptjs) para los tres roles | #009 | — |
| RF-002 | Creación de sesión QR con token HMAC-SHA256 rotativo cada 30 s | #004 | ADR-003 |
| RF-003 | Registro de asistencia por escaneo QR + verificación facial biométrica | #002 | ADR-002, ADR-006 |
| RF-004 | Extracción y almacenamiento de descriptor vectorial facial (`FLOAT8[]`) en enrolamiento | #002 | ADR-002 |
| RF-005 | Verificación facial en < 200 ms con SIMILARITY_THRESHOLD = 0.55 | #002 | ADR-006 |
| RF-006 | Panel del instructor actualizado cada 5 s durante sesiones activas | #003 | ADR-007 |
| RF-007 | Registro de excusa con soporte adjunto almacenado en Cloudinary | #010 | ADR-004 |
| RF-008 | Acceso a evidencias mediante URLs firmadas con TTL 5 min | #010 | ADR-004 |
| RF-009 | Flujo de excusa unidía → instructor; multidía → coordinador + fan-out | #012 | ADR-009 |
| RF-010 | Control de concurrencia en aprobación de excusas (Optimistic Locking) | #013 | ADR-008 |
| RF-011 | Exclusión de aprendices inactivos de listas operativas | #014 | — |
| RF-012 | Catálogo cerrado de motivos de retiro de aprendices | #006 | — |
| RF-013 | Validación Regex/Zod de documento (numérico) y nombre (alfabético) | #005 | — |
| RF-014 | Formato de fecha compacto (`12 ago. 2026`) en zona America/Bogota | #015 | — |
| RF-015 | Constraint de reapertura extemporánea de QR (máx. 10 min post-expiración) | #004 | ADR-003 |

### 7.2 Requisitos No Funcionales (RNF)

| ID | Requisito | Métrica |
|----|-----------|---------|
| RNF-001 | Latencia de verificación facial | < 200 ms post-optimización vectorial |
| RNF-002 | Disponibilidad del sistema | > 99.5% (SLA Vercel + Neon) |
| RNF-003 | TTL de sesión JWT | 12 horas |
| RNF-004 | TTL de URL firmada Cloudinary | 300 segundos (5 min) |
| RNF-005 | Rotación del token QR | Cada 30 segundos |
| RNF-006 | Pool de conexiones BD | Máx. 10 conexiones simultáneas |
| RNF-007 | Protección de datos biométricos | Consentimiento `v1.0-2026` obligatorio pre-captura |
| RNF-008 | Intervalo de polling del panel instructor | 5 segundos (sesiones activas) |
| RNF-009 | Intentos biométricos máximos | 3 intentos antes de bloqueo |
| RNF-010 | Zona horaria de todos los timestamps | `America/Bogota` (UTC-5) |

### 7.3 Reglas de Negocio (RN)

| ID | Regla |
|----|-------|
| RN-001 | Un aprendiz solo puede registrar asistencia una vez por sesión QR activa. |
| RN-002 | Las excusas unidía solo pueden ser aprobadas por el instructor responsable de la sesión afectada. |
| RN-003 | Las excusas multidía (≥ 2 días) solo pueden ser resueltas por el coordinador. |
| RN-004 | Un QR expirado no puede reabrirse si han transcurrido más de 10 minutos desde `expires_at`. |
| RN-005 | El enrolamiento biométrico requiere consentimiento explícito del aprendiz (versión `v1.0-2026`). |
| RN-006 | Tras 3 intentos fallidos de verificación facial, el flujo se bloquea y se notifica al instructor. |
| RN-007 | Los aprendices inactivos no pueden escanear QR ni registrar asistencia. |
| RN-008 | Las evidencias de excusa son de acceso restringido: solo el instructor, coordinador y el propio aprendiz pueden visualizarlas. |
| RN-009 | El motivo de retiro de un aprendiz debe seleccionarse del catálogo predefinido. |
| RN-010 | Un registro de excusa debe vincularse a la ficha académica activa del aprendiz. |

---

## 8. Alcance del MVP

### Dentro del alcance

- ✅ Autenticación JWT por documento para Instructor, Aprendiz y Coordinador.
- ✅ Creación de sesión QR con token rotativo HMAC-SHA256 (30 s) y límite extemporáneo 10 min.
- ✅ Extracción de descriptor biométrico (`Float32Array` 128D) + almacenamiento `FLOAT8[]` en PostgreSQL.
- ✅ Verificación facial client-side con distancia euclidiana (< 200 ms, umbral 0.55).
- ✅ Registro de excusas con enrutamiento diferenciado (unidía → instructor, multidía → coordinador + fan-out).
- ✅ Bloqueo optimista (`excuse_requests.version` + HTTP 409) en aprobación concurrente de excusas.
- ✅ Almacenamiento seguro en Cloudinary con URLs firmadas de 5 min (sin 403/404).
- ✅ Polling activo de 5 s + `revalidateTag` para panel del instructor en tiempo real.
- ✅ Exportación de reportes en CSV/Excel.

### Fuera del alcance (post-MVP)

- ❌ Parsing automático de certificados médicos mediante OCR.
- ❌ Aplicaciones nativas iOS/Android (wrappers).
- ❌ Sincronización offline-first con base de datos local.
- ❌ Generador de reportes PDF personalizados avanzados.
- ❌ Búsqueda de similitud aproximada (ANN) para identificación 1:N (requiere `pgvector`).

---

## 9. Preguntas Pendientes Resueltas por ADRs

| Pregunta | Resolución | ADR |
|----------|------------|-----|
| ¿Cómo prevenir fraude de asistencia por compartir QR? | Token HMAC-SHA256 rotativo 30 s + constraint `expires_at` | ADR-003 |
| ¿Cómo reducir latencia de verificación biométrica? | Vector `FLOAT8[]` en BD, verificación 1 sola inferencia < 200 ms | ADR-002, ADR-006 |
| ¿Cómo actualizar el panel del instructor en tiempo real en serverless? | Polling 5 s + `revalidateTag` | ADR-007 |
| ¿Cómo proteger documentos de excusa en Cloudinary? | `public_id` en BD + URL firmada 5 min en backend | ADR-004 |
| ¿Quién aprueba excusas de varios días? | Coordinador (multidía), Instructor (unidía) | ADR-009 |
| ¿Cómo prevenir aprobaciones simultáneas duplicadas? | Optimistic Locking `version` + HTTP 409 | ADR-008 |
| ¿Cómo estructurar el repositorio para múltiples perfiles? | Estructura modular `app/web`, `backend`, `database`, `docs` | ADR-005 |

---

## 10. Servicios y Variables de Entorno

| Variable | Servicio | Uso |
|----------|----------|-----|
| `DATABASE_URL` | PostgreSQL Neon | Cadena de conexión con SSL |
| `JWT_SECRET` | jsonwebtoken | Firma de tokens de sesión |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | Nombre del cloud |
| `CLOUDINARY_API_KEY` | Cloudinary | Autenticación de API |
| `CLOUDINARY_API_SECRET` | Cloudinary | Firma de URLs privadas |
| `RESEND_API_KEY` | Resend | Envío de emails de notificación |
| `EMAIL_PROVIDER` | Resend | Selector de proveedor de email |
| `EMAIL_FROM` | Resend | Dirección remitente |

---

## 11. Glosario

| Término | Definición |
|---------|------------|
| **Ficha** | Grupo de formación SENA asociado a un programa técnico (ej. ADSO 2711425). |
| **Jornada** | Turno de clase: Diurna, Tarde, Nocturna o Mixta. |
| **Ambiente** | Aula o laboratorio donde se imparte la clase. |
| **Aprendiz** | Estudiante SENA en proceso de formación. |
| **Instructor** | Docente SENA responsable de una o más fichas. |
| **Coordinador** | Figura de autoridad transversal con acceso global al sistema. |
| **Descriptor facial** | Vector `Float32Array` de 128 dimensiones que representa matemáticamente un rostro. |
| **Token rotativo** | HMAC-SHA256 truncado a 16 caracteres hexadecimales, regenerado cada 30 s. |
| **Excusa unidía** | Inasistencia justificada de exactamente 1 día calendario. |
| **Excusa multidía** | Inasistencia justificada de 2 o más días calendario. |
| **URL firmada** | URL temporal generada con `CLOUDINARY_API_SECRET` con TTL de 300 s. |
| **Bloqueo optimista** | Estrategia de control de concurrencia que detecta conflictos mediante campo `version`. |

---

*Documento mantenido por el equipo MercaGo Full Stack.*  
*Versión 3.0 — 2026-08-22*
