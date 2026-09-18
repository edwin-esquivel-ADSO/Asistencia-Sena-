# ## ADR-002: Verificación Biométrica Facial de Aprendices

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
