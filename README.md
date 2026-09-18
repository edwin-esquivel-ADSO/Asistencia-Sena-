# Sistema de Gestión de Asistencia SENA

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-336791?style=flat-square&logo=postgresql)](https://neon.tech/)
[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel_Ready-black?style=flat-square&logo=vercel)](https://vercel.com/)
[![Governance](https://img.shields.io/badge/Architecture-Monolith_Governance_Framework-39a900?style=flat-square)](./05-architecture/modular-monolith.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](./LICENSE)

Sistema integral de gestión, control y auditoría de asistencia para centros de formación del **Servicio Nacional de Aprendizaje (SENA)**. Diseñado como un **Monolito Modular** de alta confiabilidad en Next.js 14 (App Router), con verificación facial biométrica en el cliente, códigos QR dinámicos rotativos (HMAC-SHA256), geocercas GPS y flujo transaccional de excusas (Unidía / Multidía) con control de concurrencia optimista.

---

## 🏛️ Estructura del Repositorio (Monolith Governance Framework)

El proyecto adopta rigurosamente el estándar de gobernanza de software monolítico organizado por dominios numerados:

```text
├── .github/workflows/       # Automatización CI/CD y despliegue continuo en Vercel
├── docs/                    # Framework de Gobernanza y Documentación Técnica
│   ├── 00-governance/       # Reglas de equipo, DoD, DoR y políticas de seguridad
│   ├── 01-context/          # Visión institucional, glosario de términos y Discovery v3.0
│   ├── 02-domain/           # Bounded contexts, reglas de negocio e invariantes
│   ├── 03-product/          # Enfoque del problema, framing y valor al usuario
│   ├── 04-requirements/     # Requisitos funcionales, no funcionales y matriz de trazabilidad
│   ├── 05-architecture/     # Arquitectura en capas, monolito modular y suite ADR-001 a ADR-009
│   ├── 06-data/             # Modelo relacional en 3FN y almacenamiento vectorial FLOAT8[]
│   ├── 07-api/              # Contratos OpenAPI 3.0 y convenciones REST
│   ├── 08-uml/              # Índice y diagramas de secuencia, clases y componentes
│   ├── 09-modules/          # Catálogo de módulos internos (Auth, Aprendiz, Session, Excuse)
│   ├── 10-devops/           # Configuración local, variables de entorno y despliegue
│   ├── 11-quality/          # Estrategia de pruebas TDD y criterios de aceptación
│   ├── 12-ux-ui/            # Sistema de diseño SENA y estándares visuales responsive
│   ├── 13-operations/       # Observabilidad, métricas y manual de respuesta a incidentes
│   └── _stacks/             # Guías de referencia tecnológica (Node/TypeScript)
├── database/                # Scripts DDL, migraciones idempotentes y semillas (seeds)
├── public/                  # Archivos estáticos y modelos cliente
├── src/                     # Código fuente de producción (Next.js 14 App Router)
│   ├── app/                 # Capa de Presentación y Route Handlers (Controladores delgados)
│   ├── components/          # Componentes UI reutilizables y Navbar responsive
│   ├── domain/              # Modelos de dominio puros y validaciones Zod
│   ├── lib/                 # Utilidades criptográficas, fechas Bogotá y clientes DB/Cloudinary
│   ├── repositories/        # Capa de acceso a datos PostgreSQL (Neon)
│   └── services/            # Capa de lógica de negocio y orquestación
├── .env.example             # Plantilla de variables de entorno seguras
├── 00-sdd-guide.md          # Guía metodológica de desarrollo guiado por especificación
├── CHANGELOG.md             # Registro cronológico de cambios y versiones
├── CONTRIBUTING.md          # Guía de contribución para desarrolladores
├── LICENSE                  # Licencia de software MIT
└── package.json             # Dependencias del proyecto y scripts npm
```

---

## ✨ Características Principales

1. **Códigos QR Dinámicos Rotativos:**
   - Vigencia base fija de **5 minutos**.
   - Rotación criptográfica cada 30 segundos mediante HMAC-SHA256 para evitar fraudes por captura de pantalla.
   - Ventana de gracia máxima de **10 minutos** post-expiración para reaperturas extemporáneas o generación de QR para tardíos.

2. **Verificación Facial Biométrica 128D:**
   - Inferencia en el navegador del aprendiz vía `@vladmandic/face-api` (< 200 ms).
   - Vector de incrustación de 128 dimensiones reales (`FLOAT8[]` / JSON).
   - Umbral de distancia euclidiana $\le 0.55$. Máximo 3 intentos antes de requerir revisión presencial.

3. **Flujo de Excusas con Bloqueo Optimista:**
   - **Excusas Unidía (1 día):** Enrutadas automáticamente a la bandeja de entrada del Instructor a cargo.
   - **Excusas Multidía (2+ días):** Tramitadas exclusivamente por el Coordinador Académico con notificación en abanico (*fan-out*) a los instructores vinculados.
   - Control de concurrencia optimista (`version`) que retorna `HTTP 409 Conflict` ante modificaciones simultáneas.

4. **Almacenamiento Seguro de Evidencias:**
   - Soportes médicos y actas alojadas en Cloudinary como activos autenticados/privados.
   - Acceso exclusivo mediante URLs firmadas temporales con expiración estricta de 5 minutos (300 s), evitando errores 403.

5. **Auditoría y Trazabilidad:**
   - Registro de IP pública, dispositivo, navegador y geolocalización GPS con cálculo de geocerca por ambiente.
   - Exportación de informes completos de auditoría en formato Excel `.xlsx`.

---

## 🚀 Inicio Rápido (Entorno Local)

### Prerrequisitos
- Node.js 18.x o superior.
- Instancia de PostgreSQL (Neon o local).
- Cuenta de Cloudinary (para carga de soportes de excusas).

### Instalación
```bash
# 1. Clonar el repositorio
git clone https://github.com/edwin-esquivel-ADSO/Asistencia-Sena-.git
cd Asistencia-Sena-

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Completar DATABASE_URL, JWT_SECRET, CLOUDINARY_* en .env

# 4. Ejecutar migraciones de base de datos
npm run db:migrate

# 5. Iniciar servidor de desarrollo
npm run dev
```
Acceda a [http://localhost:3000](http://localhost:3000) en su navegador.

---

## 🧪 Verificación de Calidad y Compilación

Para comprobar que el código cumple con todos los estándares antes de confirmar cambios:

```bash
# Verificación estricta de tipos TypeScript
npx tsc --noEmit

# Compilación de producción Next.js 14
npm run build
```

---

## 📄 Gobernanza y Documentación Clave

- [Políticas de Seguridad (`docs/00-governance/security-policies.md`)](./docs/00-governance/security-policies.md)
- [Glosario del Dominio (`docs/01-context/glosario.md`)](./docs/01-context/glosario.md)
- [Matriz de Descubrimiento (`docs/01-context/discovery.md`)](./docs/01-context/discovery.md)
- [Patrón de Monolito Modular (`docs/05-architecture/modular-monolith.md`)](./docs/05-architecture/modular-monolith.md)
- [Registro de Decisiones Arquitectónicas (ADRs)](./docs/05-architecture/decisions/README.md)
- [Modelo de Datos en 3FN y Biometría (`docs/06-data/models.md`)](./docs/06-data/models.md)
- [Contratos OpenAPI 3.0 (`docs/07-api/openapi-contracts.yaml`)](./docs/07-api/openapi-contracts.yaml)

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Consulte el archivo [`LICENSE`](./LICENSE) para más detalles.
