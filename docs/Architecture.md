# CareFlow Architecture

Smart Appointment & Queue Management Platform for Malaysian Clinics

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Key Architectural Patterns](#key-architectural-patterns)
4. [Component Breakdown](#component-breakdown)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Security Model](#security-model)
7. [Scalability Notes](#scalability-notes)

---

## System Overview

CareFlow connects patients, receptionists, doctors, and clinic administrators through two client applications backed by a unified Supabase platform. Push notifications are delivered via Firebase Cloud Messaging (FCM) to both mobile and web clients.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CareFlow System                                  │
│                                                                             │
│  ┌──────────────────────┐              ┌──────────────────────────────────┐ │
│  │  Patient Mobile App  │              │       Clinic Web App             │ │
│  │  (React Native Expo) │              │       (Next.js 15)               │ │
│  │                      │              │                                  │ │
│  │  - Book appointments │              │  - Receptionist dashboard        │ │
│  │  - Join walk-in queue│              │  - Doctor consultation view      │ │
│  │  - Track queue status│              │  - Clinic admin panel            │ │
│  │  - View history      │              │  - Queue management              │ │
│  └──────────┬───────────┘              └─────────────┬────────────────────┘ │
│             │                                        │                      │
│             │  HTTPS / WebSocket                     │  HTTPS / WebSocket   │
│             │  (Supabase client)                     │  (Supabase client)   │
│             │                                        │                      │
│             └──────────────────┬─────────────────────┘                      │
│                                │                                            │
│                    ┌───────────▼────────────┐                               │
│                    │       Supabase         │                               │
│                    │                        │                               │
│                    │  ┌──────────────────┐  │                               │
│                    │  │   Auth (OTP/JWT)  │  │                               │
│                    │  └──────────────────┘  │                               │
│                    │  ┌──────────────────┐  │                               │
│                    │  │  PostgreSQL DB   │  │                               │
│                    │  │  (RLS enabled)   │  │                               │
│                    │  └──────────────────┘  │                               │
│                    │  ┌──────────────────┐  │                               │
│                    │  │   Realtime       │  │                               │
│                    │  │  (Channels/WS)   │  │                               │
│                    │  └──────────────────┘  │                               │
│                    │  ┌──────────────────┐  │                               │
│                    │  │    Storage       │  │                               │
│                    │  │  (Avatars/Docs)  │  │                               │
│                    │  └──────────────────┘  │                               │
│                    └───────────┬────────────┘                               │
│                                │                                            │
│                    ┌───────────▼────────────┐                               │
│                    │   Firebase FCM         │                               │
│                    │                        │                               │
│                    │  Push notifications    │                               │
│                    │  to mobile & web       │                               │
│                    └───────────┬────────────┘                               │
│                                │                                            │
│             ┌──────────────────┴─────────────────────┐                     │
│             │                                        │                     │
│             ▼                                        ▼                     │
│  ┌──────────────────────┐              ┌─────────────────────────────────┐ │
│  │  Patient Device       │              │  Clinic Staff Device            │ │
│  │  (iOS / Android)      │              │  (Desktop browser)              │ │
│  └──────────────────────┘              └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Patient app | React Native (Expo) | SDK 52+ |
| Clinic web | Next.js (App Router) | 15.x |
| Backend / DB | Supabase (PostgreSQL) | Latest |
| Realtime | Supabase Realtime | Built-in |
| Auth | Supabase Auth (OTP + JWT) | Built-in |
| Storage | Supabase Storage | Built-in |
| Push notifications | Firebase Cloud Messaging | Latest |
| Monorepo | Turborepo + pnpm workspaces | Latest |

---

## Architecture Decisions

### Why Supabase?

**Realtime subscriptions for live queue management**
The core value of CareFlow is that patients can watch their queue position update in real time without polling. Supabase Realtime provides WebSocket-based subscriptions on top of PostgreSQL's logical replication (via publication), allowing both the patient app and the clinic dashboard to react instantly to changes in the `queue_entries` and `queues` tables. This eliminates the need to maintain a separate WebSocket server.

**Built-in Auth with OTP**
Malaysian clinics primarily identify patients by phone number. Supabase Auth natively supports SMS OTP through configurable SMS providers (Twilio, MessageBird), meaning patient onboarding requires zero password management. JWT tokens issued by Supabase Auth are automatically validated by PostgREST on every API call.

**Row-Level Security (RLS) as the authorization layer**
Multi-tenancy — where multiple clinics share the same database but must never see each other's data — is enforced entirely at the PostgreSQL layer via RLS policies. Application code cannot accidentally bypass these controls because the database itself enforces them. This also means any future client (e.g., a third-party integration) is safe by default.

**PostgREST auto-generated REST API**
Supabase wraps PostgreSQL with PostgREST, giving an instant, type-safe REST API without writing backend routes. Edge Functions cover the few cases (e.g., triggering FCM notifications, generating queue numbers atomically) where a custom server-side procedure is needed.

### Why Next.js App Router?

- **Server Components by default** — data fetching happens on the server, reducing client bundle size and eliminating waterfall fetches for the clinic dashboard.
- **Server Actions** — form mutations (creating appointments, updating queue status) run as authenticated server-side functions without needing separate API route handlers.
- **Nested layouts** — the receptionist view, doctor view, and admin view share common shell layouts without re-rendering navigation.
- **Streaming and Suspense** — the queue board can stream in incrementally so receptionists see partial data immediately.
- **Vercel deployment** — zero-config deployment with edge middleware for auth session refresh.

### Why React Native Expo?

- **Single codebase, iOS + Android** — clinic operators serve both platforms; maintaining two native codebases is not viable for a small team.
- **Expo Router** — file-based routing mirrors Next.js conventions, lowering the mental overhead of switching between the two apps.
- **Expo Notifications** — unified API over APNs (iOS) and FCM (Android) for push notification token registration and foreground handling.
- **EAS Build** — managed cloud builds mean no Mac required for iOS builds in CI/CD.
- **OTA updates** — minor bug fixes ship to patients instantly via Expo Updates without going through app store review.

### Why Turborepo + pnpm workspaces?

- **Shared packages** — TypeScript types (`packages/types`), database query helpers (`packages/db`), and UI primitives (`packages/ui`) are written once and consumed by both apps without duplication.
- **Incremental builds** — Turborepo caches build artefacts per package. Changing only the mobile app does not rebuild the web app.
- **Single version lock** — pnpm workspace protocol (`workspace:*`) keeps all internal packages on the same version, preventing subtle type mismatches.

---

## Key Architectural Patterns

### RLS for Multi-Tenancy

Every table that holds clinic-specific data has a `clinic_id` column. RLS policies use JWT claims (specifically `auth.uid()`) to determine which `clinic_staff` record the user holds, and therefore which `clinic_id` they are authorized to access.

```
┌───────────────────────────────────────────────────────────────┐
│  PostgreSQL RLS Policy (example: queue_entries)               │
│                                                               │
│  Patient:                                                     │
│    SELECT where patient_id = auth.uid()                       │
│    INSERT where patient_id = auth.uid()                       │
│                                                               │
│  Receptionist / Doctor:                                       │
│    SELECT where queue.clinic_id IN                            │
│      (SELECT clinic_id FROM clinic_staff                      │
│       WHERE user_id = auth.uid() AND is_active = true)        │
│    UPDATE where same clinic_id check                          │
│                                                               │
│  Clinic Admin:                                                │
│    Full CRUD within their clinic_id                           │
└───────────────────────────────────────────────────────────────┘
```

The application never passes a `clinic_id` filter explicitly — the database enforces it. This means even if a bug causes the app to omit a filter, data from another clinic cannot leak.

### Realtime Channels per Queue

Each active queue gets its own Supabase Realtime channel scoped to `queue_id`. Clients subscribe to a filtered channel so they only receive events relevant to their queue, reducing unnecessary traffic.

```
Channel name pattern:  queue:{queue_id}

Patient app subscribes to:
  - queue_entries changes WHERE queue_id = :id AND patient_id = auth.uid()
    → re-renders patient's own position card

Receptionist dashboard subscribes to:
  - queue_entries changes WHERE queue_id = :id
    → re-renders full queue list
  - queues changes WHERE id = :id
    → updates current_number display
```

Realtime is enabled via `ALTER TABLE queue_entries REPLICA IDENTITY FULL` so that UPDATE and DELETE events carry the full old row, allowing clients to diff state correctly.

### Optimistic UI Updates

For latency-sensitive actions (joining a queue, marking arrived), the client applies the expected state change immediately before the Supabase call resolves. If the server call fails, the state rolls back.

```
User taps "Join Queue"
        │
        ▼
┌───────────────────┐     ┌───────────────────────┐
│ Optimistic update │     │ Supabase INSERT call  │
│ (local state)     │────▶│ (async)               │
│ position: 4       │     │                       │
└───────────────────┘     └──────────┬────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │ Success                         │ Failure
                    ▼                                 ▼
         Realtime event confirms       Revert local state,
         server position = 4           show error toast
```

---

## Component Breakdown

### Monorepo Structure

```
careflow/
├── apps/
│   ├── web/                    Next.js 15 clinic web application
│   │   ├── app/                App Router pages and layouts
│   │   │   ├── (auth)/         Login / OTP verification
│   │   │   ├── (receptionist)/ Queue board, check-in, walk-ins
│   │   │   ├── (doctor)/       Consultation view, patient notes
│   │   │   └── (admin)/        Clinic settings, staff, reports
│   │   ├── components/         Web-only React components
│   │   ├── hooks/              Web-only custom hooks
│   │   └── lib/                Supabase browser client, server client
│   │
│   └── mobile/                 React Native Expo patient app
│       ├── app/                Expo Router screens
│       │   ├── (auth)/         Phone number entry, OTP
│       │   ├── (tabs)/         Home, Search clinics, Queue status, Profile
│       │   └── clinic/         Clinic detail, book appointment, join queue
│       ├── components/         Mobile-only React Native components
│       ├── hooks/              Mobile-only hooks (notifications, location)
│       └── lib/                Supabase React Native client
│
├── packages/
│   ├── types/                  Shared TypeScript interfaces and enums
│   │   ├── database.ts         Auto-generated Supabase DB types
│   │   ├── models.ts           Domain model interfaces
│   │   └── enums.ts            Status enums, role enums
│   │
│   ├── db/                     Shared database query helpers
│   │   ├── queries/            Typed query functions (no raw SQL in apps)
│   │   └── mutations/          Insert/update helpers
│   │
│   ├── ui/                     Shared design system (React Native Web)
│   │   ├── components/         Button, Card, Badge, Input, Modal
│   │   └── theme/              Colors, spacing, typography tokens
│   │
│   └── utils/                  Pure utility functions
│       ├── date.ts             Date/time formatting (Malaysian timezone)
│       ├── queue.ts            Queue number formatting, ETA calculation
│       └── validation.ts       Zod schemas for forms
│
├── supabase/
│   ├── migrations/             SQL migration files
│   ├── seed.sql                Development seed data
│   └── functions/              Supabase Edge Functions
│       ├── send-notification/  Trigger FCM push via Firebase Admin SDK
│       ├── next-queue-entry/   Atomically advance queue, call next patient
│       └── generate-slots/     Generate time_slots from doctor_schedules
│
├── turbo.json                  Turborepo pipeline config
└── pnpm-workspace.yaml         Workspace package declarations
```

### Supabase Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `send-notification` | Called by DB trigger or app code | Sends FCM push to patient device token |
| `next-queue-entry` | Receptionist taps "Call Next" | Atomically increments `queues.current_number`, sets entry status to `CALLED`, triggers notification |
| `generate-slots` | Clinic admin saves schedule | Creates `time_slots` rows for next N days based on `doctor_schedules` |

---

## Data Flow Diagrams

### Flow 1: Patient Joins Walk-In Queue

```
Patient App                 Supabase DB              Receptionist Web
     │                           │                         │
     │  1. GET /queues            │                         │
     │     WHERE clinic_id=X     │                         │
     │     AND queue_date=today  │                         │
     │─────────────────────────▶│                         │
     │                           │                         │
     │  2. Returns active queue  │                         │
     │◀─────────────────────────│                         │
     │                           │                         │
     │  3. POST queue_entries    │                         │
     │     { queue_id, type:     │                         │
     │       WALK_IN, priority:3}│                         │
     │─────────────────────────▶│                         │
     │                           │                         │
     │                           │ 4. DB trigger increments│
     │                           │    queues.current_number│
     │                           │    assigns queue_number │
     │                           │                         │
     │  5. Returns queue_entry   │                         │
     │     { queue_number: 14,   │                         │
     │       position: 3 }       │                         │
     │◀─────────────────────────│                         │
     │                           │                         │
     │                           │ 6. Realtime broadcast   │
     │                           │    INSERT on            │
     │                           │    queue_entries        │
     │                           │────────────────────────▶│
     │                           │                         │
     │                           │                         │ 7. Dashboard
     │                           │                         │    re-renders
     │                           │                         │    queue list
     │                           │                         │
     │  8. Subscribe to Realtime │                         │
     │     channel queue:{id}    │                         │
     │─────────────────────────▶│                         │
     │  (waits for position      │                         │
     │   updates)                │                         │
```

### Flow 2: Receptionist Calls Next Patient

```
Receptionist Web            Supabase Edge Fn          Patient App
     │                       next-queue-entry               │
     │                           │                          │
     │  1. POST /functions/v1/   │                          │
     │     next-queue-entry      │                          │
     │     { queue_id }          │                          │
     │──────────────────────────▶│                          │
     │                           │                          │
     │                           │ 2. BEGIN transaction     │
     │                           │    SELECT next WAITING   │
     │                           │    entry ORDER BY        │
     │                           │    priority, joined_at   │
     │                           │                          │
     │                           │ 3. UPDATE entry status   │
     │                           │    = CALLED              │
     │                           │    SET called_at = now() │
     │                           │                          │
     │                           │ 4. UPDATE queues         │
     │                           │    current_number++      │
     │                           │    COMMIT                │
     │                           │                          │
     │                           │ 5. Realtime broadcast    │
     │                           │    UPDATE on             │
     │                           │    queue_entries         │
     │                           │──────────────────────────▶│
     │                           │                          │
     │                           │                          │ 6. Patient app
     │                           │                          │    receives WS
     │                           │                          │    event,
     │                           │                          │    shows alert
     │                           │                          │
     │                           │ 7. Call send-notification│
     │                           │    Edge Fn               │
     │                           │    { patient_id,         │
     │                           │      type: CALLED_TO_    │
     │                           │      CONSULTATION }      │
     │                           │                          │
     │                           │ 8. FCM push via          │
     │                           │    Firebase Admin SDK    │
     │                           │──────────────────────────▶│
     │                           │                          │
     │  9. Returns updated entry │                          │ 10. Push
     │◀──────────────────────────│                          │     notification
     │  Dashboard re-renders     │                          │     appears on
     │  "Now serving: #14"       │                          │     lock screen
```

---

## Security Model

### Authentication Flow

1. Patient or staff enters phone number.
2. Supabase Auth sends OTP via SMS.
3. Client submits OTP; Supabase returns a JWT access token + refresh token.
4. JWT is stored in secure storage (SecureStore on mobile, httpOnly cookie on web via Supabase SSR helpers).
5. Every subsequent request to PostgREST includes the JWT in the `Authorization: Bearer` header.
6. Supabase validates JWT signature and injects `auth.uid()` into the PostgreSQL session.
7. RLS policies use `auth.uid()` — no application-level auth checks needed.

### RLS Policy Overview

| Table | Patient | Receptionist | Doctor | Clinic Admin |
|---|---|---|---|---|
| `profiles` | Own row only | Read (patients of their clinic) | Read (patients in their queue) | Full (own clinic) |
| `clinics` | Read (is_active) | Read (own clinic) | Read (own clinic) | Full (own clinic) |
| `clinic_staff` | None | Read (own clinic) | Read (own clinic) | Full (own clinic) |
| `doctors` | Read (active) | Read (own clinic) | Own row | Full (own clinic) |
| `doctor_schedules` | Read | Read | Own rows | Full (own clinic) |
| `time_slots` | Read (available) | Full (own clinic) | Own slots | Full (own clinic) |
| `appointments` | Own rows | Full (own clinic) | Own clinic | Full (own clinic) |
| `queues` | Read (own clinic) | Full (own clinic) | Read (own) | Full (own clinic) |
| `queue_entries` | Own rows | Full (own clinic) | Read (own queue) | Full (own clinic) |
| `notifications` | Own rows | None | Own rows | None |

### JWT Custom Claims

Staff roles are stored in `clinic_staff.role`. On login, a database hook populates custom JWT claims:

```json
{
  "sub": "<user_uuid>",
  "role": "authenticated",
  "app_metadata": {
    "clinic_id": "<clinic_uuid>",
    "staff_role": "RECEPTIONIST"
  }
}
```

RLS policies reference `(auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid` to avoid an extra join on every row access.

### Data Isolation Guarantees

- All tables with clinic-specific data have `clinic_id` and RLS enforced.
- `service_role` key (bypasses RLS) is used only in Edge Functions running on the server — never exposed to any client.
- The `anon` key is used only for unauthenticated read of `clinics` (directory listing). All other operations require a valid JWT.

---

## Scalability Notes

### Database

- **Connection pooling** — Supabase uses PgBouncer in transaction mode by default. The web app uses the pooled connection string; Edge Functions use the direct connection string for transactions.
- **Read replicas** — For future growth, reporting queries (appointment history, analytics) should be directed to a read replica to avoid contention with the live queue writes.
- **Queue table hotspot** — The `queues` table row for an active queue is updated on every `next-queue-entry` call. If a clinic has very high volume, consider using `SELECT ... FOR UPDATE SKIP LOCKED` within a transaction (already used in the Edge Function) to prevent lock contention.

### Realtime

- Supabase Realtime has a concurrent connection limit per plan tier. Each open queue board (receptionist tab) holds one WebSocket connection; each patient watching their queue holds one. Monitor connection count in the Supabase dashboard.
- Channels are scoped to `queue_id` — each clinic's queue is an independent channel, so growth is horizontal.

### Push Notifications

- FCM delivery is handled by Firebase infrastructure and scales independently of CareFlow servers.
- Notification fan-out (e.g., notifying all patients in a queue about a doctor delay) should be done via a single Edge Function call that loops over patient tokens rather than N individual calls from the client.

### Caching

- Next.js Server Components cache clinic directory data (list of clinics, doctor profiles) with `next/cache` revalidation tags. Stale-while-revalidate keeps the web app fast under traffic spikes.
- Time slot availability is re-fetched on focus in the mobile app (via React Query's `refetchOnWindowFocus` equivalent) rather than held in long-lived cache.
