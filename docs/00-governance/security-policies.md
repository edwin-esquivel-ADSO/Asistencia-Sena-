# 00 — Políticas de Seguridad (Security Policies)
## Sistema de Gestión de Asistencia SENA

**Proyecto:** Asistencia SENA MVP  
**Repositorio:** `edwin-esquivel-ADSO/Asistencia-Sena-`  
**Clasificación de Información:** Confidencial / Datos Biométricos Sensibles  
**Marco Legal:** Ley 1581 de 2012 (Habeas Data Colombia), Decreto 1377 de 2013  

---

## 1. Gestión de Secretos y Variables de Entorno

| Regla | Detalle de Implementación |
|---|---|
| **Cero Secretos en Git** | Ninguna clave API, token JWT, URL de conexión a base de datos o credencial de Cloudinary debe ser confirmada en el repositorio. Verificado mediante `.gitignore` y escaneo pre-commit. |
| **Entorno Local** | Usar archivo `.env` basado en [`.env.example`](../.env.example). Jamás compartir valores de producción en chats ni repositorios públicos. |
| **Entorno Producción (Vercel)** | Las variables de entorno (`DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_*`) son inyectadas exclusivamente en el panel seguro de Vercel (Project Settings > Environment Variables). |
| **Rotación de Secretos** | Cadencia cada 90 días o inmediatamente ante cualquier sospecha de compromiso. |

---

## 2. Protección de Datos Biométricos Sensibles

1. **Consentimiento Informado Previo:**
   - Todo aprendiz debe otorgar consentimiento explícito antes de enrolar su descriptor facial (`biometric_consent_at` timestamp registrado).
2. **Privacidad desde el Diseño (Privacy by Design):**
   - No se almacenan imágenes fotográficas crudas en disco local ni en bases de datos relacionales accesibles públicamente.
   - El vector de incrustación facial (128 dimensiones `Float32Array`) se extrae directamente en el cliente mediante `@vladmandic/face-api`.
   - El vector se persiste en PostgreSQL utilizando el tipo `FLOAT8[]` con índice btree/cubo para comparación euclidiana ultra-rápida (< 200 ms).
3. **Control de Intentos:**
   - Máximo 3 intentos de verificación facial por sesión para mitigar ataques de presentación o suplantación. Tras el 3er fallo, se escala a revisión manual con el instructor.

---

## 3. Seguridad en Códigos QR Dinámicos

1. **Criptografía HMAC-SHA256:**
   - Cada código QR proyectado por el instructor utiliza un token rotativo generado criptográficamente mediante HMAC-SHA256 acoplado a ranuras de tiempo de 30 segundos.
2. **Ventana de Solapamiento Temporal:**
   - Tolerancia estricta de `[-1, 0, +1]` ranuras (máximo 90 segundos de vigencia absoluta) para absorción de latencia de red.
3. **Ventana de Gracia Extemporánea:**
   - La reapertura de sesiones o generación de QR para tardíos está restringida a un máximo inmutable de **10 minutos** tras la expiración de la sesión principal (`expires_at`).

---

## 4. Almacenamiento Seguro de Evidencias y Excusas

1. **Almacenamiento Privado en Cloudinary:**
   - Los archivos de soporte médico o justificaciones se cargan con tipo `authenticated` / `private`.
   - En base de datos se almacena únicamente el `public_id` seguro.
2. **URLs Firmadas Temporales:**
   - El acceso a los documentos de soporte se realiza exclusivamente a través del endpoint interno [`/api/excusas/signed-url`](../07-api/openapi-contracts.yaml) que expide URLs firmadas HMAC con un Time-To-Live (TTL) de **5 minutos** (300 segundos).
   - Se prohíbe el acceso a URLs públicas directas, evitando fugas de información médica confidencial.

---

## 5. Control de Concurrencia y Transacciones Atómicas

- **Bloqueo Optimista (Optimistic Locking):**
  - Toda modificación en el estado de una excusa (`pending` -> `approved` / `rejected`) evalúa la columna `version` en PostgreSQL.
  - Si la fila fue modificada concurrentemente, la base de datos retorna 0 filas afectadas y el backend responde con código `HTTP 409 Conflict`, impidiendo sobrescrituras inconsistentes entre instructores y coordinadores.

---

## 6. Autenticación y Autorización

- **Document-First Authentication:**
  - El identificador institucional primario es el número de documento de identidad oficial.
  - Normalización canónica (insensible a mayúsculas, minúsculas y tildes).
- **Sesión Stateless con JWT:**
  - Tokens firmados con algoritmo HS256, expiración estricta de 12 horas, cookies HTTP-only, Secure y SameSite=Lax.
- **Principio de Mínimo Privilegio:**
  - Separación estricta de roles: `aprendiz`, `instructor`, `coordinador`.
  - Las decisiones de autorización residen en la capa de servicios (`src/services/`), nunca en la interfaz de usuario.
