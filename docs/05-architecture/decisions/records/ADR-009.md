# ## ADR-009: Arquitectura de Flujo de Trabajo Diferenciado para Excusas Unidía vs. Multidía

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