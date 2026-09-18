# ## ADR-003: Códigos QR Dinámicos Temporales con Firma de Seguridad y Límite Extemporáneo

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
