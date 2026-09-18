# ## ADR-001: Migración del Monolito PHP a Next.js (App Router + TypeScript)

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
