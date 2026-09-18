# ## ADR-004: Almacenamiento Seguro de Evidencias mediante URLs Firmadas en Cloudinary

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
