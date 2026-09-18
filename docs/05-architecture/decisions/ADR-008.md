# ## ADR-008: Control de Concurrencia Transaccional en la Gestión de Excusas

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
