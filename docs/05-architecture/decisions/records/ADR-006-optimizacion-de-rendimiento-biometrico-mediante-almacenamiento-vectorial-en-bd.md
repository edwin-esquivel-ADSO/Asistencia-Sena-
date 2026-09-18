# ## ADR-006: Optimización de Rendimiento Biométrico mediante Almacenamiento Vectorial en BD

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
