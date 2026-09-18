# Registros de Decisiones Arquitectónicas (ADRs)
## Proyecto: Asistencia SENA

**Repositorio:** `edwin-esquivel-ADSO/Asistencia-Sena-`  
**Abreviación:** `asn`  
**Equipo:** MercaGo — Full Stack Team  
**Plataforma de despliegue:** Vercel (Serverless Edge Functions)  
**Base de datos:** PostgreSQL (Neon)  
**Almacenamiento de activos:** Cloudinary  

---

> **Nota metodológica:** Este documento agrupa únicamente decisiones de naturaleza **arquitectónica** — cambios en la estructura del sistema, estrategias de persistencia, seguridad, protocolos de comunicación y flujos de trabajo del dominio. Los cambios de diseño visual, validaciones de formulario, animaciones y correcciones menores de UI/UX se gestionan como *Features / Bug Fixes* en el tablero de tareas y **no son elegibles** como ADRs.

---

## Índice

| #       | Título                                                                 | Estatus   |
|---------|------------------------------------------------------------------------|-----------|
| ADR-001 | Migración del Monolito PHP a Next.js (App Router + TypeScript)         | Aceptado  |
| ADR-002 | Verificación Biométrica Facial de Aprendices                           | Aceptado  |
| ADR-003 | Códigos QR Dinámicos Temporales con Firma de Seguridad y Límite Extemporáneo | Aceptado  |
| ADR-004 | Almacenamiento Seguro de Evidencias mediante URLs Firmadas en Cloudinary | Aceptado  |
| ADR-005 | Reestructuración Modular del Repositorio (Gobernanza Unificada)        | Aceptado  |
| ADR-006 | Optimización de Rendimiento Biométrico mediante Almacenamiento Vectorial en BD | Propuesto |
| ADR-007 | Sincronización y Revalidación Reactiva en Tiempo Real para Sesiones Activas | Propuesto |
| ADR-008 | Control de Concurrencia Transaccional en la Gestión de Excusas         | Propuesto |
| ADR-009 | Arquitectura de Flujo de Trabajo Diferenciado para Excusas Unidía vs. Multidía | Propuesto |

---

## ADR-001: Migración del Monolito PHP a Next.js (App Router + TypeScript)

**Número:** ADR-001  
**Estatus:** Aceptado  
**Fecha:** 2026-08-22  

### Contexto y Problema

El sistema de asistencia SENA existía como una aplicación monolítica PHP clásica con arquitectura MVC ubicada en `legacy_php_app/` (directorios `config/`, `controllers/`, `helpers/`, `models/`, `views/`). Esta arquitectura presentaba las siguientes limitaciones críticas:

- **Acoplamiento total:** La lógica de presentación, negocio y acceso a datos coexistían en el mismo proceso, dificultando el mantenimiento y las pruebas unitarias.
- **Ausencia de tipado estático:** PHP sin anotaciones de tipo estrictas generaba errores en tiempo de ejecución difíciles de detectar durante el desarrollo.
- **Capacidades en tiempo real limitadas:** Implementar lectura de QR desde cámara, verificación facial en el navegador y actualizaciones en vivo del panel del instructor era inviable bajo el paradigma PHP tradicional (render servidor + recarga de página completa).
- **Incompatibilidad con despliegue serverless:** La infraestructura objetivo (Vercel) requiere funciones sin estado con cold-start rápido, incompatible con el ciclo de vida de una aplicación PHP con estado de sesión en servidor.
- **Experiencia de desarrollo fragmentada:** El equipo Full Stack (perfiles JavaScript/TypeScript) requería cambiar de contexto entre el ecosistema PHP y las herramientas frontend modernas.

### Decisión Tomada

Se migra la totalidad del sistema a **Next.js 14 con App Router y TypeScript**, adoptando el siguiente mapa de responsabilidades:

| Capa anterior (PHP) | Capa destino (Next.js) | Ruta en el repo |
|---|---|---|
| `legacy_php_app/views/` | Componentes React (Client & Server Components) | `app/web/` → `src/app/` |
| `legacy_php_app/controllers/` | Route Handlers de Next.js API | `backend/` → `src/app/api/` |
| `legacy_php_app/models/` | Módulo de acceso a datos con `pg` (Pool) | `database/` + `src/lib/db.ts` |
| `legacy_php_app/config/` | Variables de entorno en `.env` + `next.config` | Raíz del repositorio |

La aplicación se despliega en **Vercel** aprovechando el Edge Runtime para rutas de alta frecuencia y Node.js Runtime para rutas que requieren operaciones criptográficas (`crypto`, `bcryptjs`) o acceso directo a la base de datos PostgreSQL vía `pg.Pool`.

**Stack tecnológico resultante:**

```
Next.js 14.2.x (App Router)
TypeScript 5.x
React 18.x
PostgreSQL (Neon) — pg 8.x con Pool de hasta 10 conexiones
Cloudinary 2.x — almacenamiento de imágenes y evidencias
@vladmandic/face-api 1.7.x — inferencia facial en el navegador
jsonwebtoken 9.x — autenticación JWT sin sesión de servidor
bcryptjs 3.x — hash de credenciales
qrcode 1.5.x — generación de tokens QR
```

### Consecuencias

**Positivas:**
- Tipado estático extremo a extremo (TypeScript en cliente, servidor y scripts de migración) reduce la clase de errores de runtime.
- Un único lenguaje (TypeScript) en todo el stack elimina el cambio de contexto para el equipo.
- El modelo de Server Components de Next.js permite renders con datos frescos sin costosas llamadas de API desde el cliente.
- Despliegue continuo automático en Vercel desde la rama principal del repositorio.
- La separación de rutas en `src/app/api/` impone por convención la separación entre lógica de presentación y lógica de negocio.

**Negativas:**
- El tiempo de cold-start de las Serverless Functions en Vercel puede introducir latencia perceptible en la primera petición tras periodos de inactividad (mitigable con Vercel Pro o warm-up pings).
- Las Serverless Functions son efímeras: no pueden mantener estado en memoria entre invocaciones. Esto prohíbe cachés en memoria globales y conexiones de WebSocket persistentes en el servidor.
- La curva de aprendizaje de App Router (Server vs. Client Components, `use server`, `revalidateTag`) requiere capacitación del equipo.
- El código legado `legacy_php_app/` debe mantenerse en el repositorio durante la transición para consulta, representando deuda técnica a deprecar formalmente.

---

## ADR-002: Verificación Biométrica Facial de Aprendices

**Número:** ADR-002  
**Estatus:** Aceptado  
**Fecha:** 2026-08-22  

### Contexto y Problema

El flujo de registro de asistencia original por QR no garantizaba que el aprendiz que escaneaba el código fuera efectivamente el titular de la cuenta. Un aprendiz podía compartir sus credenciales o permitir que otro escaneara el QR en su nombre, comprometiendo la integridad del registro. El sistema necesitaba un segundo factor de verificación de identidad que:

1. Funcionara en el navegador sin requerir hardware especializado.
2. Fuera lo suficientemente preciso para el contexto educativo (no bancario).
3. Respetara el consentimiento explícito del aprendiz sobre el uso de datos biométricos.
4. No dependiera de servicios externos de reconocimiento facial (reducción de costos y latencia).

### Decisión Tomada

Se adopta un modelo de verificación biométrica facial en **dos fases**: el navegador extrae descriptores y el servidor realiza toda comparación mediante la librería `@vladmandic/face-api` solo durante la captura cliente:

#### Fase 1 — Enrolamiento (registro único)

El aprendiz, al registrarse por primera vez en `src/app/api/aprendiz/register-face/`, captura un fotograma desde su cámara. La aplicación:

1. Carga los modelos de `face-api` (`SSD MobileNet V1`, `Face Landmark 68`, `Face Recognition Net`) desde `/public/models/`.
2. Extrae un descriptor facial: un vector `Float32Array` de 128 dimensiones que representa matemáticamente el rostro.
3. Sube la imagen capturada a Cloudinary (carpeta `face_biometrics/`) como respaldo de auditoría.
4. Almacena el descriptor vectorial serializado en la columna `face_descriptor` de la tabla `aprendices`.
5. Registra el consentimiento explícito del aprendiz con versión `v1.0-2026` (campo `consent_version`) antes de cualquier captura.

#### Fase 2 — Verificación (en cada registro de asistencia)

Al escanear el QR en `src/app/api/aprendiz/verify-face/`, la aplicación:

1. Captura un nuevo fotograma desde la cámara del dispositivo.
2. Extrae el descriptor facial del fotograma actual (inferencia local, sin llamada a servicio externo).
4. Envía únicamente el descriptor del fotograma actual por HTTPS al endpoint de verificación.
5. El servidor recupera el descriptor de referencia, calcula la **distancia euclidiana** y valida la dimensión y los valores numéricos.
6. Devuelve solo `{ success, confidence, result, message?, redirect? }`, sin vectores ni `match_score`.
6. Tras `MAX_FAILED_ATTEMPTS: 3` intentos fallidos, bloquea el flujo y notifica al instructor.

**Parámetros de configuración centrales (`src/lib/face-config.ts`):**

```typescript
export const FACE_CONFIG = {
  SIMILARITY_THRESHOLD: 0.55,  // Distancia euclidiana máxima para coincidencia
  MAX_FAILED_ATTEMPTS: 3,       // Intentos fallidos antes de bloqueo
  CONSENT_VERSION: 'v1.0-2026', // Versión de política de consentimiento
};
```

### Consecuencias

**Positivas:**
- La inferencia facial ocurre **completamente en el cliente**: los fotogramas nunca se transmiten a un servidor de reconocimiento externo, preservando la privacidad.
- Sin costo por llamada a APIs externas de biometría (AWS Rekognition, Azure Face, etc.).
- El consentimiento versionado permite auditoría legal y cumplimiento con la Ley 1581 de 2012 (protección de datos personales Colombia).
- La lógica de umbral es ajustable sin redespliegue (configuración centralizada).

**Negativas:**
- Los modelos de `face-api` (~6.5 MB) deben descargarse en el primer uso, introduciendo latencia inicial en dispositivos con conectividad limitada.
- La precisión depende de las condiciones de iluminación y calidad de la cámara del dispositivo móvil del aprendiz.
- La inferencia en CPU de dispositivos de gama baja puede tomar 2–4 segundos por fotograma.
- El descriptor vectorial almacenado en la BD no es reversible a una imagen facial, pero sigue siendo un dato biométrico sensible que requiere cifrado en reposo.
- Si el aprendiz cambia significativamente de apariencia (lentes, barba, etc.), puede requerir re-enrolamiento.

---

## ADR-003: Códigos QR Dinámicos Temporales con Firma de Seguridad y Límite Extemporáneo

**Número:** ADR-003  
**Estatus:** Aceptado  
**Fecha:** 2026-08-22  

### Contexto y Problema

Un código QR estático (con token fijo) puede ser fotografiado, retransmitido o compartido fuera del aula, permitiendo que aprendices ausentes registren asistencia fraudulentamente desde ubicaciones remotas. El sistema requería un mecanismo que invalidara tokens capturados con anterioridad y evitara la reapertura retroactiva de sesiones ya cerradas desde el historial del instructor.

Problemas concretos identificados en el MVP:

1. **Token de sesión estático:** El `token` almacenado en `qr_sessions` no cambiaba durante la sesión activa, facilitando la captura y reutilización.
2. **Reapertura de QR histórico:** El instructor podía re-generar el QR de una sesión ya finalizada (`status = 'finished'`) desde el historial, permitiendo el registro extemporáneo de asistencias con fecha retroactiva.

### Decisión Tomada

Se adopta una estrategia de **token rotativo criptográfico** combinada con un **constraint de tiempo máximo** en la base de datos:

#### Capa 1 — Token Rotativo (HMAC-SHA256, ventana de 30 segundos)

Implementado en `src/lib/qr-security.ts`:

```typescript
// Slot temporal: cambia cada 30 segundos
const timeSlot = Math.floor(Date.now() / 30000) + timeSlotOffset;

// Token = HMAC-SHA256(sessionToken, "sena_rotative_slot:" + timeSlot)
// truncado a 16 caracteres hexadecimales
export function generateRotativeToken(sessionToken: string, timeSlotOffset: number = 0): string {
  return crypto
    .createHmac('sha256', sessionToken)
    .update(`sena_rotative_slot:${timeSlot}`)
    .digest('hex')
    .substring(0, 16);
}
```

El QR mostrado en la pantalla del instructor contiene el token rotativo recalculado cada 30 segundos. La validación acepta los slots `[-1, 0, +1]` para compensar latencia de red, produciendo una ventana efectiva de **10–15 segundos** de solapamiento entre rotaciones.

#### Capa 2 — Constraint de Tiempo Máximo en BD (`expires_at`)

La columna `expires_at TIMESTAMPTZ NOT NULL` en `qr_sessions` registra el momento de expiración calculado al abrir la sesión:

```sql
expires_at = created_at + INTERVAL '1 minute' * duration_minutes
```

La ruta de validación del QR en el backend rechaza cualquier intento de registro si:
- `qr_sessions.status = 'finished'`, **O**
- `NOW() > qr_sessions.expires_at + INTERVAL '10 minutes'` (margen extemporáneo máximo configurable).

La reapertura de QR desde el historial solo es posible para sesiones cuyo `expires_at` no haya superado el margen máximo, **prohibiendo el registro retroactivo**.

### Consecuencias

**Positivas:**
- Un token QR capturado en fotografía es inválido en máx. 30 segundos, eliminando el ataque de replay básico.
- El constraint `expires_at` en BD provee una segunda línea de defensa independiente de la lógica de aplicación.
- `crypto.timingSafeEqual` previene ataques de timing al comparar tokens.
- La ventana de solapamiento `[-1, +1]` mitiga falsos rechazos por desfase de reloj entre cliente e instructor.

**Negativas:**
- El QR debe actualizarse en el cliente del instructor cada 30 segundos (polling o websocket), incrementando la complejidad del componente frontend.
- Si el reloj del servidor Vercel y el reloj del dispositivo del aprendiz difieren en más de 30 segundos, la validación puede fallar (mitigable con NTP sincronizado en Vercel).
- El token rotativo agrega una llamada extra al backend en cada escaneo (validación del slot actual).

---

## ADR-004: Almacenamiento Seguro de Evidencias mediante URLs Firmadas en Cloudinary

**Número:** ADR-004  
**Estatus:** Aceptado  
**Fecha:** 2026-08-22  

### Contexto y Problema

Los aprendices adjuntan documentos de soporte (excusas médicas, permisos) al registrar una inasistencia justificada. Estos archivos se almacenan en Cloudinary. El MVP inicial empleaba URLs públicas estáticas almacenadas en `attendances.excuse_path`. Esto generaba dos clases de errores críticos:

- **Error 403 (Forbidden):** Cloudinary denegaba el acceso a recursos configurados como `authenticated` o `private` cuando se accedía con URLs sin firma.
- **Error 404 (Not Found):** URLs almacenadas en BD apuntando a versiones antiguas del `public_id` de Cloudinary tras re-subidas o reorganización de carpetas.

Adicionalmente, las URLs públicas permitirían acceso no autorizado a documentos sensibles (historiales médicos) a cualquier persona con la URL, violando el principio de mínimo privilegio.

### Decisión Tomada

Se adopta el patrón de **URL firmada temporal generada en el Backend en tiempo de consulta**. La columna `attendances.excuse_path` almacena únicamente el `public_id` de Cloudinary (identificador estable, no una URL), y la URL de acceso se genera dinámicamente al momento de servir la respuesta.

**Implementación en `src/lib/cloudinary.ts`:**

```typescript
export function getSignedImageUrl(publicId: string, expiresInSeconds: number = 300): string {
  return cloudinary.url(publicId, {
    type: 'authenticated',      // Tipo de acceso restringido en Cloudinary
    sign_url: true,             // Firma HMAC con API Secret
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds, // 5 minutos por defecto
    secure: true,               // HTTPS obligatorio
  });
}
```

**Flujo de acceso a evidencias:**

```
Cliente (Instructor / Coordinador)
  → GET /api/excusas/[filename]
      → Backend recupera registro de BD (obtiene public_id)
      → Backend llama a getSignedImageUrl(public_id, 300)
      → Backend retorna { signedUrl, expiresIn: 300 }
  → Cliente redirige al usuario a la signedUrl
      → Cloudinary valida la firma y sirve el archivo
      → La URL expira en 5 minutos
```

La firma se genera con `cloudinary.utils.api_sign_request()` usando el `CLOUDINARY_API_SECRET` almacenado exclusivamente en variables de entorno del servidor, nunca expuesto al cliente.

### Consecuencias

**Positivas:**
- Elimina los errores 403 al garantizar que todas las URLs presentadas al usuario sean siempre válidas en el momento de generación.
- El `public_id` es estable ante reorganizaciones de carpetas en Cloudinary, eliminando los errores 404 por URLs desactualizadas.
- Las evidencias son inaccesibles sin una URL firmada fresca, protegiendo documentos sensibles de acceso no autorizado.
- El TTL de 5 minutos limita la ventana de exposición si una URL es interceptada.

**Negativas:**
- Cada visualización de evidencia requiere una llamada al backend para obtener la URL firmada (no se puede cachear la URL en el cliente porque expira).
- Si el `CLOUDINARY_API_SECRET` se compromete, un atacante puede generar URLs firmadas válidas. Requiere rotación de credenciales en Vercel.
- Los recursos de tipo `authenticated` en Cloudinary tienen un costo adicional según el plan contratado.

---

## ADR-005: Reestructuración Modular del Repositorio (Gobernanza Unificada)

**Número:** ADR-005  
**Estatus:** Aceptado  
**Fecha:** 2026-08-22  

### Contexto y Problema

El MVP inicial depositó código en una estructura plana determinada por las convenciones de `create-next-app` (`src/app`, `src/lib`), sin separación explícita de las responsabilidades de frontend, backend, base de datos y documentación. Este acoplamiento estructural impedía:

- Asignar propiedad de código clara por perfil (frontend dev vs. backend dev vs. DBA).
- Aplicar reglas de linting y testing diferenciadas por capa.
- Evolucionar cada capa de manera independiente (p. ej., migrar la BD sin tocar el frontend).
- Cumplir con las reglas de gobernanza de repositorio fijadas por el instructor.

La presencia de `legacy_php_app/` sin estructura de deprecación formal, scripts utilitarios en la raíz (`push_db.js`, `seed-ficha-3413974.js`) y la ausencia de un directorio `docs/` consolidado agravaban la entropía estructural.

### Decisión Tomada

Se adopta la **estructura de carpetas unificada obligatoria** definida por la gobernanza del instructor:

```
asistencia-sena/
├── app/
│   └── web/                # Frontend — Next.js App Router, Server & Client Components
│       ├── aprendiz/       # Vistas y flujos del rol Aprendiz
│       ├── instructor/     # Vistas y flujos del rol Instructor
│       ├── coordinador/    # Vistas y flujos del rol Coordinador
│       ├── scan/           # Flujo de escaneo de QR
│       └── login/          # Autenticación
├── backend/                # APIs y Serverless Functions (Next.js Route Handlers)
│   ├── aprendiz/           # Endpoints del dominio Aprendiz
│   ├── instructor/         # Endpoints del dominio Instructor
│   ├── coordinador/        # Endpoints del dominio Coordinador
│   ├── auth/               # Autenticación JWT
│   ├── cloudinary/         # Endpoints de firma de URLs
│   └── excusas/            # Gestión de excusas e inasistencias
├── database/               # Esquemas SQL, migraciones y conector
│   ├── schema.sql          # DDL completo de la BD
│   ├── migrate.js          # Script de migración idempotente
│   └── seeds/              # Datos semilla (movidos desde raíz)
└── docs/                   # Documentación técnica y arquitectónica
    ├── discovery.md        # Hallazgos del MVP y análisis inicial
    └── adrs.md             # Suite completa de ADRs (este documento)
```

**Acciones de migración implicadas:**

1. Mover `src/app/(roles)/` → `app/web/`
2. Mover `src/app/api/` → `backend/`
3. Mover `src/lib/` → `backend/lib/` o `backend/shared/`
4. Mover `push_db.js`, `seed-ficha-3413974.js` → `database/seeds/`
5. Marcar `legacy_php_app/` para deprecación con `README-DEPRECATED.md` interno.
6. Crear `docs/discovery.md` y `docs/adrs.md`.

### Consecuencias

**Positivas:**
- La estructura refleja con precisión los cuatro dominios de responsabilidad del sistema.
- Facilita la asignación de revisores de PR por directorio (`CODEOWNERS`).
- Habilita reglas de CI diferenciadas: lint estricto en `backend/`, build check en `app/web/`, migrations check en `database/`.
- El directorio `docs/` como ciudadano de primera clase incentiva la documentación continua.

**Negativas:**
- La migración requiere actualizar todos los imports relativos en el proyecto (breaking change para el compilador TypeScript hasta que se ajusten los `paths` en `tsconfig.json`).
- El cambio de estructura de rutas puede requerir actualizar la configuración de Vercel (`vercel.json`) si las rutas de API cambian de prefijo.
- La transición introduce un periodo de divergencia entre la estructura actual (`src/`) y la objetivo, que debe gestionarse en una rama de migración dedicada.

---

## ADR-006: Optimización de Rendimiento Biométrico mediante Almacenamiento Vectorial en BD

**Número:** ADR-006  
**Estatus:** Propuesto  
**Fecha:** 2026-08-22  

### Contexto y Problema

La implementación vigente del ADR-002 opera de la siguiente manera:

1. El cliente extrae el descriptor facial del fotograma actual.
2. El cliente transmite ese descriptor por HTTPS.
3. El backend recupera el descriptor de referencia y calcula la similitud sin exponerlo.

Este flujo presenta un cuello de botella crítico de rendimiento:

- **Latencia de descarga:** La imagen de referencia almacenada en Cloudinary tiene un tamaño promedio de 80–200 KB. En condiciones de red móvil deficiente (común en sedes SENA), la descarga puede tardar 2–8 segundos.
- **Doble inferencia:** Se ejecuta la red neuronal de `face-api` **dos veces** por verificación: una para la imagen de referencia y otra para el fotograma actual, duplicando el tiempo de procesamiento en CPU.
- **Costo de red:** Cada verificación descarga 80 KB adicionales de Cloudinary como mínimo, impactando el consumo del plan.

### Decisión Tomada

Se almacena el **descriptor vectorial facial** (`Float32Array` de 128 dimensiones) directamente en PostgreSQL, extrayéndolo **una única vez durante el enrolamiento**. En la verificación, el cliente solo envía su descriptor actual y el backend compara contra el valor almacenado, eliminando la descarga de imagen y la exposición del vector de referencia.

**Cambio de esquema en `database/schema.sql`:**

```sql
ALTER TABLE aprendices
  ADD COLUMN IF NOT EXISTS face_descriptor FLOAT8[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS face_enrolled_at TIMESTAMPTZ DEFAULT NULL;

-- Índice parcial para consulta eficiente de aprendices con descriptor enrolado
CREATE INDEX idx_aprendices_face_enrolled
  ON aprendices(documento)
  WHERE face_descriptor IS NOT NULL;
```

**Comparación de flujos:**

```
Verificación actual (lenta):
  Cliente → Backend: GET /verify-face
  Backend → Cloudinary: GET imagen_referencia.jpg   [80-200 KB, 2-8 s]
  Backend → Cliente: imagen_referencia
  Cliente: inferencia face-api(imagen_referencia) → descriptor_ref
  Cliente: inferencia face-api(fotograma)         → descriptor_actual
  Cliente: distancia_euclidiana(descriptor_ref, descriptor_actual)

Verificación propuesta (optimizada):
  Cliente → Backend: GET /verify-face
  Backend → BD: SELECT face_descriptor FROM aprendices WHERE documento = ?
  Backend → Cliente: face_descriptor serializado   [~1 KB, < 50 ms]
  Cliente: inferencia face-api(fotograma)          → descriptor_actual
  Cliente: distancia_euclidiana(face_descriptor, descriptor_actual)
```

**Reducción de payload:** de 80–200 KB a ~1 KB (128 floats × 8 bytes = 1.024 bytes).

**Enrolamiento actualizado (`src/app/api/aprendiz/register-face/`):**

```typescript
const detection = await faceapi
  .detectSingleFace(canvas)
  .withFaceLandmarks()
  .withFaceDescriptor();

const descriptor = Array.from(detection.descriptor); // Float32Array → number[]

await query(
  `UPDATE aprendices
   SET face_descriptor = $1, face_enrolled_at = NOW()
   WHERE documento = $2`,
  [descriptor, aprendizDocumento]
);
```

### Consecuencias

**Positivas:**
- Eliminación de la descarga de imagen en verificación: reducción de latencia de 2–8 s a < 200 ms.
- Una sola inferencia por verificación en lugar de dos: reducción de 50% en uso de CPU del dispositivo.
- Reducción de costos de transferencia de Cloudinary (aprox. 80 KB × verificaciones/día).
- El vector sigue siendo un dato biométrico no reversible a imagen facial, manteniendo el nivel de privacidad del enfoque anterior.

**Negativas:**
- El tipo `FLOAT8[]` de PostgreSQL no admite índices para búsqueda de similitud aproximada (ANN). Para comparación 1:1 (aprendiz contra su propio descriptor) es suficiente; para comparación 1:N se requeriría `pgvector`.
- Los descriptores almacenados en BD son datos biométricos sensibles que requieren cifrado en reposo y control de acceso estricto.
- El descriptor vectorial debe re-generarse (re-enrolamiento) si se actualiza la versión del modelo de `face-api`, ya que los descriptores no son comparables entre versiones de modelo.
- Se requiere una migración de BD (`ALTER TABLE`) sobre datos en producción, que debe ejecutarse con precaución en la instancia Neon.

---

## ADR-007: Sincronización y Revalidación Reactiva en Tiempo Real para Sesiones Activas

**Número:** ADR-007  
**Estatus:** Propuesto  
**Fecha:** 2026-08-22  

### Contexto y Problema

El panel del instructor muestra en tiempo real la lista de aprendices que han registrado asistencia durante una sesión QR activa. Sin embargo, se identificó un fallo crítico de sincronización: cuando un aprendiz registra asistencia (llamada POST a `/api/aprendiz/verify-face`), el panel del instructor **no refleja el cambio** hasta que el instructor recarga manualmente la página.

La causa raíz es que los datos del panel se obtienen mediante un Server Component de Next.js que renderiza los datos en el momento del build o de la primera carga, y no existe un mecanismo de invalidación de caché que provoque un re-fetch cuando la tabla `attendances` se modifica.

En el modelo serverless de Vercel, no es viable mantener conexiones WebSocket persistentes en el servidor para push de eventos. Se necesita una estrategia de actualización reactiva compatible con el runtime serverless.

### Decisión Tomada

Se adopta una estrategia de **Polling Activo desde el Cliente con Intervalo de 5 segundos**, complementada con **`revalidateTag` de Next.js** para invalidación selectiva del caché de Server Components:

#### Estrategia A — Polling desde el Cliente (implementación inmediata)

El componente del panel del instructor implementa un polling periódico con `setInterval` en un Client Component:

```typescript
'use client';

import { useEffect, useState } from 'react';

export function LiveAttendancePanel({ sessionId }: { sessionId: string }) {
  const [attendances, setAttendances] = useState([]);
  const [isActive, setIsActive]       = useState(true);

  useEffect(() => {
    const fetchAttendances = async () => {
      const res  = await fetch(`/api/instructor/session/${sessionId}/attendances`, {
        cache: 'no-store',
      });
      const data = await res.json();
      setAttendances(data.attendances);
      setIsActive(data.sessionStatus === 'active');
    };

    fetchAttendances(); // Carga inicial

    // Polling cada 5 segundos mientras la sesión esté activa
    const interval = setInterval(() => {
      if (isActive) fetchAttendances();
    }, 5000);

    return () => clearInterval(interval); // Cleanup al desmontar
  }, [sessionId, isActive]);
}
```

#### Estrategia B — `revalidateTag` en Route Handlers (invalidación selectiva)

Cuando el aprendiz registra asistencia exitosamente en `POST /api/aprendiz/verify-face`, el Route Handler invalida el tag de caché del panel del instructor:

```typescript
import { revalidateTag } from 'next/cache';

// Al final del handler de registro exitoso:
revalidateTag(`session-${sessionId}-attendances`);
```

El Server Component del panel usa el tag correspondiente:

```typescript
const attendances = await fetch(`/api/instructor/session/${sessionId}/attendances`, {
  next: { tags: [`session-${sessionId}-attendances`] },
});
```

**Selección de estrategia por escenario:**

| Escenario | Estrategia recomendada |
|---|---|
| Panel activo con sesión abierta | Polling de 5 s (Estrategia A) |
| Server Components estáticos (historial) | `revalidateTag` (Estrategia B) |
| Futuro con Vercel Pro | Server-Sent Events (SSE) desde Route Handler |

### Consecuencias

**Positivas:**
- El polling de 5 segundos es suficiente para el caso de uso educativo (no requiere sub-segundo como trading o gaming).
- Compatible con cualquier plan de Vercel sin WebSockets o infraestructura adicional.
- `revalidateTag` garantiza que los históriales también reflejen datos actualizados en la siguiente solicitud.
- El `clearInterval` en el `useEffect` cleanup evita fugas de memoria y llamadas a sesiones ya cerradas.

**Negativas:**
- El polling genera N solicitudes cada 5 segundos (N = instructores con panel abierto), incrementando el consumo de invocaciones de Serverless Functions en Vercel.
- Un intervalo de 5 segundos puede percibirse como lento en clases con grupos grandes donde los aprendices escanean simultáneamente.
- `revalidateTag` requiere que los Route Handlers y Server Components estén en el mismo deployment de Next.js; no funciona entre instancias separadas.
- Sin WebSockets reales, el sistema no puede notificar al instructor de eventos puntuales (p. ej., un intento de verificación facial fallido) sin polling adicional.

---

## ADR-008: Control de Concurrencia Transaccional en la Gestión de Excusas

**Número:** ADR-008  
**Estatus:** Propuesto  
**Fecha:** 2026-08-22  

### Contexto y Problema

El flujo de gestión de excusas permite que el instructor y/o el coordinador aprueben o rechacen una excusa presentada por un aprendiz. Se identificó una condición de carrera crítica:

**Escenario de race condition:**

1. El coordinador y el instructor visualizan simultáneamente la misma excusa en estado `pendiente`.
2. El coordinador hace clic en "Aprobar" → petición `PATCH /api/excusas/[id]` con `{ estado: 'aprobada' }`.
3. El instructor hace clic en "Rechazar" → petición `PATCH /api/excusas/[id]` con `{ estado: 'rechazada' }`.
4. Ambas peticiones llegan al servidor casi simultáneamente.
5. Sin control de concurrencia, la segunda escritura sobreescribe silenciosamente a la primera, produciendo un estado final indeterminado.

El esquema actual de `attendances` no tiene mecanismo de versión ni bloqueo, por lo que ambas actualizaciones son aceptadas por la BD independientemente del orden de llegada.

### Decisión Tomada

Se adopta el patrón de **Bloqueo Optimista (Optimistic Locking)** mediante un campo `version` de tipo entero en la tabla de excusas:

**Cambio de esquema (`database/schema.sql`):**

```sql
ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS excuse_status VARCHAR(20)
    DEFAULT 'pendiente'
    CHECK (excuse_status IN ('pendiente', 'aprobada', 'rechazada')),
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS excuse_reviewed_by INT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS excuse_reviewed_at TIMESTAMPTZ;
```

**Lógica de actualización con Optimistic Locking en el Route Handler:**

```typescript
// PATCH /api/excusas/[id]
// Body: { estado: 'aprobada' | 'rechazada', version: number, reviewerId: number }

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { estado, version, reviewerId } = await req.json();

  const result = await query(`
    UPDATE attendances
    SET
      excuse_status      = $1,
      version            = version + 1,
      excuse_reviewed_by = $2,
      excuse_reviewed_at = NOW(),
      updated_at         = NOW()
    WHERE
      id             = $3
      AND excuse_status  = 'pendiente'   -- Solo si aún no fue procesada
      AND version        = $4            -- Solo si la versión coincide
    RETURNING id, version
  `, [estado, reviewerId, params.id, version]);

  if (result.length === 0) {
    return Response.json(
      { error: 'Conflicto: la excusa ya fue procesada por otro usuario. Recarga la página.' },
      { status: 409 } // HTTP 409 Conflict
    );
  }

  return Response.json({ success: true, newVersion: result[0].version });
}
```

**Flujo del cliente con manejo de conflicto:**

```
Cliente A (Coordinador):                    Cliente B (Instructor):
GET /api/excusas/123                        GET /api/excusas/123
  → { version: 0, estado: 'pendiente' }      → { version: 0, estado: 'pendiente' }

PATCH { estado: 'aprobada', version: 0 }    PATCH { estado: 'rechazada', version: 0 }

Servidor procesa A primero:
  UPDATE WHERE id=123 AND version=0 → 1 fila → version=1
  → 200 OK { newVersion: 1 }

Servidor procesa B después:
  UPDATE WHERE id=123 AND version=0 → 0 filas (version ya es 1)
  → 409 Conflict { error: 'Conflicto...' }

Cliente B muestra toast de error y recarga el estado actual de la excusa.
```

### Consecuencias

**Positivas:**
- Previene la corrupción de estado en escenarios de concurrencia sin necesidad de bloqueos pesimistas (no hay `SELECT FOR UPDATE` que pueda producir deadlocks).
- El código HTTP 409 permite al cliente frontend distinguir conflictos de versión de errores de servidor (5xx) y mostrar mensajes de usuario informativos.
- Sin overhead de bloqueo de filas en BD: el `UPDATE` condicional por `version` es atómico a nivel de PostgreSQL.
- Auditable: el campo `excuse_requests.version` permite reconstruir la secuencia de modificaciones.

**Negativas:**
- Requiere que el cliente siempre incluya el `version` actual al enviar una actualización, lo que exige que el frontend siempre lea el estado más reciente antes de actuar.
- En escenarios de alta concurrencia (muchas aprobaciones simultáneas), los clientes pueden recibir múltiples respuestas 409 consecutivas, aunque en el dominio educativo de SENA este riesgo es mínimo.
- El campo `version` agrega complejidad al contrato de la API que debe documentarse para el equipo frontend.

---

## ADR-009: Arquitectura de Flujo de Trabajo Diferenciado para Excusas Unidía vs. Multidía

**Número:** ADR-009  
**Estatus:** Propuesto  
**Fecha:** 2026-08-22  

### Contexto y Problema

El sistema de excusas del MVP trata todas las inasistencias justificadas de manera uniforme, independientemente de si el aprendiz falta un solo día o múltiples días consecutivos. Esto genera dos problemas de flujo de trabajo:

1. **Enrutamiento incorrecto:** Una excusa de un solo día (una clase específica) debería ser resuelta por el instructor responsable de esa sesión, no por el coordinador, reduciendo la carga administrativa de coordinación para ausencias menores.

2. **Fan-out insuficiente para ausencias prolongadas:** Cuando un aprendiz falta 2 o más días, puede tener múltiples instructores afectados (distintas materias/fichas). La excusa necesita notificar y ser registrada por todos los instructores involucrados, o escalarse al coordinador como figura de autoridad transversal.

### Decisión Tomada

Se adopta una **arquitectura de flujo diferenciado** basada en la duración de la ausencia como disparador de la lógica de enrutamiento:

#### Tipo 1 — Excusa Unidía (1 día de ausencia)

**Definición:** El aprendiz falta a una o varias sesiones en un único día calendario (`fecha_inicio == fecha_fin`).

**Flujo:**
```
Aprendiz crea excusa (fecha_inicio == fecha_fin)
  → Sistema identifica qr_session de la fecha afectada
  → Sistema identifica instructor_id de esa qr_session
  → Notificación directa al instructor responsable
      (email via src/lib/email.ts + badge en panel del instructor)
  → Instructor aprueba / rechaza desde su panel
  → attendance.excuse_status actualizado → attendance.estado = 'Justificado'
  → Aprendiz notificado del resultado
```

**Autoridad de resolución:** Instructor de la sesión afectada.

#### Tipo 2 — Excusa Multidía (2+ días de ausencia)

**Definición:** El aprendiz falta 2 o más días calendario (`fecha_fin > fecha_inicio`).

**Flujo con fan-out:**
```
Aprendiz crea excusa (fecha_fin > fecha_inicio, diferencia >= 2 días)
  → Sistema calcula rango de fechas afectadas [fecha_inicio … fecha_fin]
  → Sistema consulta qr_sessions WHERE fecha IN (rango) AND ficha = aprendiz.ficha
  → Sistema identifica conjunto único de instructor_ids afectados
  → Enrutamiento dual:
      a) Notificación al Coordinador → bandeja de excusas multidía
      b) Fan-out: Notificación a TODOS los instructores con sesiones en el rango
  → Coordinador aprueba / rechaza globalmente (autoridad de resolución primaria)
  → Sistema actualiza excuse_status en TODOS los registros del rango afectado
  → Notificación de resultado a aprendiz e instructores afectados
```

**Autoridad de resolución:** Coordinador (decisión global). Los instructores reciben notificación informativa pero no tienen autoridad de resolución individual en excusas multidía.

**Esquema de datos necesario (`database/schema.sql`):**

```sql
-- Tabla de excusas como entidad independiente
CREATE TABLE IF NOT EXISTS excusas (
  id                  SERIAL PRIMARY KEY,
  aprendiz_documento  VARCHAR(50) NOT NULL,
  fecha_inicio        DATE NOT NULL,
  fecha_fin           DATE NOT NULL,
  -- Columna generada: 'unidía' si mismo día, 'multidía' si cubre 2+ días
  tipo                VARCHAR(10) NOT NULL
                      GENERATED ALWAYS AS (
                        CASE WHEN fecha_fin > fecha_inicio THEN 'multidía' ELSE 'unidía' END
                      ) STORED,
  motivo              TEXT NOT NULL,
  soporte_public_id   VARCHAR(255),          -- public_id de Cloudinary (ADR-004)
  estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  version             INT NOT NULL DEFAULT 0, -- Optimistic Locking (ADR-008)
  resuelto_por        INT REFERENCES users(id),
  resuelto_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Fan-out: relación excusa <-> instructores notificados
CREATE TABLE IF NOT EXISTS excusa_instructores (
  excusa_id     INT REFERENCES excusas(id) ON DELETE CASCADE,
  instructor_id INT REFERENCES users(id)   ON DELETE CASCADE,
  notificado_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (excusa_id, instructor_id)
);
```

**Lógica de enrutamiento (`backend/excusas/route.ts`):**

```typescript
import { differenceInCalendarDays } from 'date-fns';

const diasAusencia = differenceInCalendarDays(fechaFin, fechaInicio) + 1;

if (diasAusencia === 1) {
  // Flujo Unidía: notificar solo al instructor de la sesión afectada
  await notificarInstructor(instructorId, excusaId);
} else {
  // Flujo Multidía: notificar al coordinador + fan-out a instructores
  await notificarCoordinador(excusaId);
  await Promise.all(
    instructoresAfectados.map((id) => notificarInstructor(id, excusaId))
  );
  await registrarFanOut(excusaId, instructoresAfectados);
}
```

### Consecuencias

**Positivas:**
- La diferenciación reduce la carga del coordinador: solo gestiona excusas que requieren su intervención (ausencias prolongadas o con implicaciones en múltiples materias).
- Los instructores tienen visibilidad y autoridad directa sobre ausencias de su clase, agilizando la resolución de casos simples.
- El fan-out garantiza que ningún instructor sea sorprendido por una ausencia prolongada sin notificación previa.
- La columna `tipo` calculada (columna generada de PostgreSQL) elimina inconsistencias de clasificación entre el backend y la BD.

**Negativas:**
- Incrementa la complejidad del dominio: se necesitan dos flujos de resolución distintos, dos plantillas de email y dos vistas de bandeja (instructor vs. coordinador).
- El fan-out a múltiples instructores vía email puede generar ruido si una excusa multidía afecta a muchos instructores (p. ej., una semana de ausencia con 5 instructores = 5 emails por excusa).
- La tabla `excusa_instructores` requiere mantenimiento si un instructor es reasignado a una ficha mientras una excusa multidía está pendiente de resolución.
- La lógica `GENERATED ALWAYS AS` de PostgreSQL para la columna `tipo` requiere compatibilidad con la versión de PostgreSQL de Neon (disponible desde PostgreSQL 12).

---

*Documento generado el 2026-08-22 — Revisión: v1.0*  
*Próxima revisión programada: al cierre de Sprint 2 o ante cualquier cambio arquitectónico mayor.*
