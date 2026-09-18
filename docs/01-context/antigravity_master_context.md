# ANTIGRAVITY MASTER CONTEXT & EXECUTION SPECIFICATION
## Project: SENA Attendance Management System (Asistencia SENA)
**Repository:** `edwin-esquivel-ADSO/Asistencia-Sena-` | **Abbreviation:** `asn`  
**Deployment Target:** Vercel (Serverless Edge & Node.js Runtimes)  
**Database:** PostgreSQL (Neon Serverless) | **Media Provider:** Cloudinary  
**Stack:** Next.js 14 (App Router), React 18, TypeScript 5, Tailwind CSS, `pg` Pool  

---

## 1. REPOSITORY LAYOUT & GOVERNANCE RULES

The project enforces a strict four-tier modular directory layout:

```text
asistencia-sena/
├── app/
│   └── web/              # Frontend — Next.js 14 App Router, Client & Server Components
│       ├── aprendiz/     # Apprentice views (access, verification, dashboard, query)
│       ├── instructor/   # Instructor views (sessions, attendances, history, roster, excuses)
│       ├── coordinador/  # Coordinator views (dashboard)
│       ├── scan/         # QR code camera scanner flow
│       └── login/        # Unified authentication portal
├── backend/              # APIs — Next.js Route Handlers (Serverless Functions)
│   ├── aprendiz/         # Apprentice endpoints (face status, verification, profile, attendance)
│   ├── instructor/       # Instructor endpoints (sessions, attendances, history, roster)
│   ├── coordinador/      # Coordinator endpoints (system stats, multi-day excuses)
│   ├── auth/             # Session management (JWT login, logout, token verification)
│   ├── cloudinary/       # Media signature endpoints & private file uploads
│   └── excusas/          # Excuse CRUD & routing handlers (Unidía / Multidía)
├── database/             # Relational Database Management
│   ├── schema.sql        # DDL Database Schema (PostgreSQL)
│   ├── migrate.js        # Idempotent database migration execution script
│   └── seeds/            # Seed data scripts for development/testing
└── docs/                 # System Architecture & Documentation Suite
    ├── discovery.md      # Full bilingual discovery matrix (#001 - #015) & requirements
    ├── adrs.md           # Architectural Decision Records (ADR-001 through ADR-009)
    └── antigravity_master_context.md # Master context specification (this file)
```

---

## 2. ARCHITECTURAL DECISION RECORDS (ADR) ALIGNMENT

All code modifications, API additions, and database alterations must comply strictly with the following active ADRs:

- **ADR-001: Next.js 14 App Router & TypeScript Migration**
  - Deprecates `legacy_php_app/`. Implements full-stack TypeScript with Next.js 14 Server/Client components and API Route Handlers.
- **ADR-002 & ADR-006: Client-Side Biometric Extraction & PostgreSQL Vector Storage**
  - Extract 128-position facial vector (`Float32Array`) on client using `@vladmandic/face-api`.
  - Store vector as `FLOAT8[]` in PostgreSQL during initial enrollment.
  - Perform 1:1 vector comparison in client (< 200 ms) with `SIMILARITY_THRESHOLD = 0.55`. Max 3 failed attempts.
- **ADR-003: Rotating HMAC-SHA256 QR Tokens & Extemporaneous Grace Period**
  - Dynamic QR token updates every 30 seconds (`sena_rotative_slot`). Solapamiento window `[-1, 0, +1]`.
  - Database constraint (`expires_at`): Reopening closed/expired QR sessions prohibited after 10 minutes past `expires_at`.
- **ADR-004: Cloudinary Signed Private URLs for Excuse Evidence**
  - Store only Cloudinary `public_id` in PostgreSQL (`attendances.excuse_path` / `excusas.soporte_public_id`).
  - Backend generates signed private URLs dynamically (`type: 'authenticated'`) with 5-minute TTL (`getSignedImageUrl`).
- **ADR-005: Modular Four-Tier Repository Governance**
  - Enforce separation across `app/web/`, `backend/`, `database/`, `docs/`.
- **ADR-007: Real-Time Active Polling & Server-Side Cache Invalidation**
  - Instructor live session panel polls `GET /api/instructor/session/[id]/attendances` every 5 seconds.
  - Route Handlers trigger `revalidateTag('session-[id]-attendances')` on new attendance mutations.
- **ADR-008: Optimistic Concurrency Control for Excuse Approvals**
  - Use `version INT NOT NULL DEFAULT 1` in `excuse_requests`; no parallel counter exists in `attendances`.
  - Execute `UPDATE excuse_requests ... WHERE id = ? AND version = ?`. Return HTTP `409 Conflict` on version mismatch.
- **ADR-009: Differentiated Excuse Workflow (Unidía vs. Multidía)**
  - Unidía (1 calendar day): Direct routing to session Instructor for approval/rejection.
  - Multidía (2+ calendar days): Routing to Coordinator for primary resolution + Fan-out email notifications to all affected Instructors.

---

## 3. BILINGUAL FINDINGS & DISCOVERY MATRIX (#001 — #015)

| ID | Title (ES / EN) | Category | Architectural / ADR Mapping | Resolution Summary |
|----|-----------------|----------|-----------------------------|--------------------|
| **#001** | Confirmación al guardar / Save Confirmation | UX / UI | Feature (No-ADR) | Loading spinners on submit, toast notifications, explicit HTTP error feedback. |
| **#002** | Verificación facial / Biometric Performance | Architecture | ADR-002 & ADR-006 | Client-side 128D vector extraction (`Float32Array`), stored as `FLOAT8[]` in DB, 1:1 matching < 200 ms. |
| **#003** | Actualización en tiempo real / Real-Time Attendance | Architecture | ADR-007 | Active polling every 5s on active sessions + `revalidateTag` cache revalidation. |
| **#004** | QR dinámico y extemporáneo / Dynamic QR Grace Period | Architecture | ADR-003 | HMAC-SHA256 30s rotating token slots + 10-minute maximum extemporaneous reopening limit. |
| **#005** | Validaciones de entrada / Input Data Validation | Backend | Feature (No-ADR) | Zod/Regex validation (Numeric-only ID documents, Alphabetical-only names). |
| **#006** | Motivos de retiro / Withdrawal Reasons Catalog | Domain | Feature (No-ADR) | Closed enum catalog (Deserción, Traslado, Cancelación, Voluntario) + optional text for "Otro". |
| **#007** | Navegación Responsive / Mobile Drawer Navigation | UI / UX | Feature (No-ADR) | Hamburger menu & slide-over drawer for viewports < 768 px. |
| **#008** | Filtros de asistencia / Status Filter Event Propagation | UI / UX | Feature (No-ADR) | `event.stopPropagation()` on P/T/J/F status filter buttons inside card containers. |
| **#009** | Login de instructor / Instructor Authentication | Auth | Feature (No-ADR) | Primary login via Identity Document ID + `bcryptjs` password validation + 12h JWT session cookie. |
| **#010** | Servido de evidencias / Private Evidence Storage | Architecture | ADR-004 | Store `public_id` in DB; serve via backend-signed Cloudinary URLs with 5-min expiration. |
| **#011** | Ficha de destino / Academic Ficha Binding | Domain | Feature (No-ADR) | Mandatory selection of active `ficha_id` when submitting student excuses. |
| **#012** | Flujo Unidía vs. Multidía / Single vs. Multi-day Excuses | Architecture | ADR-009 | Unidía (1 day) -> Instructor approval; Multidía (2+ days) -> Coordinator resolution + Instructor Fan-out. |
| **#013** | Concurrencia en excusas / Optimistic Concurrency Control | Architecture | ADR-008 | Version field `excuse_requests.version` (INT); return HTTP `409 Conflict` on concurrent edit collision. |
| **#014** | Estado activo/inactivo / Active & Inactive Apprentice States | Domain | Feature (No-ADR) | Exclude inactive apprentices (`is_active = false`) from daily active rosters by default. |
| **#015** | Formato de fechas / Compact Date Range UI | UI / UX | Feature (No-ADR) | Compact Bogota locale formatting (`12 ago. 2026` for single day; `12–15 ago. 2026` for range). |

---

## 4. SYSTEM BOUNDARIES & SCOPE DECLARATION

### IN SCOPE (MVP Delivered Capabilities)
- Multi-role JWT authentication (Instructor, Apprentice, Coordinator) via Document ID.
- Dynamic QR code generation with 30-second HMAC-SHA256 rotation & 10-minute extemporaneous grace period limit.
- Client-side biometric face extraction (`Float32Array` 128) and PostgreSQL vector storage (`FLOAT8[]`).
- Biometric verification matching (< 200 ms latency) with `SIMILARITY_THRESHOLD = 0.55`.
- Differentiated excuse submission & routing (Unidía -> Instructor; Multidía -> Coordinator + Instructor Fan-out).
- Optimistic locking concurrency control (`excuse_requests.version` returning HTTP 409 Conflict).
- Cloudinary private media storage with 5-minute signed view URLs.
- Real-time instructor panel updates via 5-second client polling and `revalidateTag` cache invalidation.
- Standard attendance roster CSV/Excel exports.

### OUT OF SCOPE (Future Post-MVP Backlog)
- Automated medical certificate OCR parsing.
- Native mobile applications (iOS/Android wrappers).
- Offline-first local database synchronization.
- Custom drag-and-drop PDF report layout designer.
- 1:N facial search / Approximate Nearest Neighbor (ANN) indexing (requires `pgvector`).

---

## 5. EXECUTION CONSTRAINTS FOR AGENTS

1. **No Code Mutating Without Test/Verification Execution:** Any code edit must be validated through appropriate verification scripts or commands.
2. **Preserve Database Types & Schema Integrities:** All SQL queries must align with `database/schema.sql` types.
3. **Respect Methodological Rules:** Always distinguish architectural decisions (ADRs) from UI/UX bug fixes or minor features.
4. **Timezone Uniformity:** All date and time calculations must enforce `America/Bogota` (UTC-5) timezone without UTC offset anomalies.

---

*Master Context Specification — SENA Attendance System v3.0 (2026-08-22)*
