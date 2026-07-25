# Sistema de Control de Asistencia SENA con QR Dinámico (Next.js 14 + Neon PostgreSQL)

Sistema web moderno y seguro para la gestión institucional de asistencia SENA mediante códigos QR dinámicos de vigencia estricta, geolocalización GPS obligatoria, geocercas por ambiente y exportación de auditoría a Excel.

---

## 🚀 Requisitos de Entorno y Variables

Para ejecutar el proyecto en desarrollo o producción se requieren las siguientes variables de entorno:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | URL de conexión a la base de datos Neon PostgreSQL (SSL activado) | `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/sena_db?sslmode=require` |
| `JWT_SECRET` | Clave secreta para la firma de cookies de sesión autenticadas | `sena_jwt_secret_super_seguro_2026` |

> ⚠️ **Importante**: Las credenciales nunca deben ser incluidas en el repositorio de Git ni expuestas en el frontend.

---

## 🛠 Despliegue Paso a Paso en Vercel

Siga estos pasos para desplegar la aplicación en la plataforma Vercel:

1. **Importar el Repositorio en Vercel**:
   - Acceda a [Vercel Dashboard](https://vercel.com/dashboard) y seleccione **"Add New..." > "Project"**.
   - Conecte su cuenta de GitHub / GitLab e importe el repositorio del proyecto.

2. **Configurar Variables de Entorno en Vercel**:
   - En la sección **Environment Variables**, añada:
     - `DATABASE_URL`: Ingrese la URL completa de conexión a Neon PostgreSQL.
     - `JWT_SECRET`: Ingrese un hash o clave secreta segura.
   - Marque las casillas para aplicar estas variables en **Production**, **Preview** y **Development**.

3. **Ejecutar Migración de Base de Datos en Neon**:
   - Antes de iniciar el primer uso, ejecute la migración una única vez ejecutando localmente o en consola con acceso a la BD:
     ```bash
     node database/migrate.js
     ```
   - La migración es idempotente y creará automáticamente las tablas, índices, geocercas iniciales y la migración del campo `expires_at` a `TIMESTAMPTZ`.

4. **Desplegar**:
   - Haga clic en **"Deploy"**. Vercel compilará automáticamente la aplicación Next.js 14 y asignará un dominio público HTTPS (ej. `https://asistencia-sena.vercel.app`).

---

## 📱 Nota Importante: Entorno Local (`localhost`) vs Producción (`HTTPS Vercel`)

- **En Entorno Local (`http://localhost:3000`)**:
  El código QR generado en pantalla contiene la URL `http://localhost:3000/...`. Este enlace solo funciona en el mismo computador y no es accesible desde teléfonos celulares externos a menos que estén conectados a la misma red local o mediante un túnel (ej. ngrok). Además, los navegadores móviles requieren contexto **HTTPS** seguro para otorgar permisos de cámara y geolocalización GPS.
  
- **En Producción Vercel (`https://...vercel.app`)**:
  Al desplegar en Vercel con un dominio HTTPS público, el código QR generado incluye automáticamente el dominio HTTPS de producción. Los aprendices podrán escanear el QR directamente con la cámara de sus teléfonos inteligentes y conceder permisos GPS sin restricciones.

---

## 🛡️ Arquitectura de Seguridad y Limitaciones Reales

1. **Vigencia Estricta de 5 Minutos**:
   - Todos los códigos QR (regulares y para llegadas tardías) tienen una duración exacta de 5 minutos calculada en PostgreSQL mediante `NOW() + INTERVAL '5 minutes'`.
   - Si el QR expira, el servidor rechaza el registro con código de estado **HTTP 410 (Gone)**.

2. **Tokens QR Rotativos Dinámicos**:
   - Dentro del período de 5 minutos, el código QR refresca su token firmado cada 30 segundos (`rotative_token` mediante HMAC-SHA256).
   - Si un estudiante toma una foto del QR y la reenvía por chat de WhatsApp minutos después, al escanear la foto antigua la firma habrá rotado y el registro será **invalidado**.

3. **Geolocalización Obligatoria y Geocercas**:
   - La captura de coordenadas GPS es **obligatoria**. El sistema bloquea el registro si el aprendiz deniega los permisos de ubicación o no cuenta con señal GPS.
   - El sistema valida mediante la fórmula Haversine la distancia en metros entre la ubicación del estudiante y el ambiente asignado. Si el estudiante se encuentra a una distancia superior al radio permitido (ej. 100m), el registro es **rechazado con HTTP 403**.

4. **Transparencia en Limitaciones Reales de Seguridad**:
   - *Nota técnica honesta*: El uso de geocercas y QR rotativos mitiga significativamente el fraude por reenvío remoto de códigos QR. Sin embargo, no sustituye por completo una verificación biométrica o un kiosco físico si un estudiante utiliza herramientas de falsificación de GPS (GPS spoofing) en un teléfono con acceso root/jailbreak. El sistema almacena la IP pública, dispositivo, navegador y precisión GPS como evidencia de auditoría para el instructor y coordinador.

---

## 📋 Jornadas Admitidas

El sistema gestiona de manera oficial las siguientes 4 jornadas institucionales:
- **Diurna**
- **Tarde**
- **Nocturna**
- **Mixta**

*(La antigua jornada "Madrugada" ha sido completamente removida y migrada automáticamente a "Tarde").*
