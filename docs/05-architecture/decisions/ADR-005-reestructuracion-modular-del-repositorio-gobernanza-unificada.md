# ## ADR-005: Reestructuración Modular del Repositorio (Gobernanza Unificada)

**Número:** ADR-005  
**Estatus:** Aceptado  
**Fecha:** 2026-08-22  

### Contexto y Problema

El MVP inicial depositó código en una estructura plana determinada por las convenciones de `create-next-app` (`src/app`, `src/lib`), sin separación explícita de las responsabilidades de frontend, backend, base de datos y documentación. Este acoplamiento estructural impedía:

- Asignar propiedad de código clara por perfil (frontend dev vs. backend dev vs. DBA).
- Aplicar reglas de linting y testing diferenciadas por capa.
- Evolucionar cada capa de manera independiente (p. ej., migrar la BD sin tocar el frontend).
- Cumplir con las reglas de gobernanza de repositorio fijadas por el instructor.

La presencia de `legacy_php_app/` sin estructura de deprecación formal, scripts utilitarios en la raíz (`push_db.js`, `seed-ficha-3413974.js`) y la ausencia de un directorio `docs/` consolidado agravaban la entropía estructural.

### Decisión Tomada

Se adopta la **estructura de carpetas unificada obligatoria** definida por la gobernanza del instructor:

```
asistencia-sena/
├── app/
│   └── web/                # Frontend — Next.js App Router, Server & Client Components
│       ├── aprendiz/       # Vistas y flujos del rol Aprendiz
│       ├── instructor/     # Vistas y flujos del rol Instructor
│       ├── coordinador/    # Vistas y flujos del rol Coordinador
│       ├── scan/           # Flujo de escaneo de QR
│       └── login/          # Autenticación
├── backend/                # APIs y Serverless Functions (Next.js Route Handlers)
│   ├── aprendiz/           # Endpoints del dominio Aprendiz
│   ├── instructor/         # Endpoints del dominio Instructor
│   ├── coordinador/        # Endpoints del dominio Coordinador
│   ├── auth/               # Autenticación JWT
│   ├── cloudinary/         # Endpoints de firma de URLs
│   └── excusas/            # Gestión de excusas e inasistencias
├── database/               # Esquemas SQL, migraciones y conector
│   ├── schema.sql          # DDL completo de la BD
│   ├── migrate.js          # Script de migración idempotente
│   └── seeds/              # Datos semilla (movidos desde raíz)
└── docs/                   # Documentación técnica y arquitectónica
    ├── discovery.md        # Hallazgos del MVP y análisis inicial
    └── adrs.md             # Suite completa de ADRs (este documento)
```

**Acciones de migración implicadas:**

1. Mover `src/app/(roles)/` → `app/web/`
2. Mover `src/app/api/` → `backend/`
3. Mover `src/lib/` → `backend/lib/` o `backend/shared/`
4. Mover `push_db.js`, `seed-ficha-3413974.js` → `database/seeds/`
5. Marcar `legacy_php_app/` para deprecación con `README-DEPRECATED.md` interno.
6. Crear `docs/discovery.md` y `docs/adrs.md`.

### Consecuencias

**Positivas:**
- La estructura refleja con precisión los cuatro dominios de responsabilidad del sistema.
- Facilita la asignación de revisores de PR por directorio (`CODEOWNERS`).
- Habilita reglas de CI diferenciadas: lint estricto en `backend/`, build check en `app/web/`, migrations check en `database/`.
- El directorio `docs/` como ciudadano de primera clase incentiva la documentación continua.

**Negativas:**
- La migración requiere actualizar todos los imports relativos en el proyecto (breaking change para el compilador TypeScript hasta que se ajusten los `paths` en `tsconfig.json`).
- El cambio de estructura de rutas puede requerir actualizar la configuración de Vercel (`vercel.json`) si las rutas de API cambian de prefijo.
- La transición introduce un periodo de divergencia entre la estructura actual (`src/`) y la objetivo, que debe gestionarse en una rama de migración dedicada.
