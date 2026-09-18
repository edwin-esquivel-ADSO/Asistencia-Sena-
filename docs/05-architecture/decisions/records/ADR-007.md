# ## ADR-007: Sincronización y Revalidación Reactiva en Tiempo Real para Sesiones Activas

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
