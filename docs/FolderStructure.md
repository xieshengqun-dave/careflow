# CareFlow – Folder Structure Reference

This document is the canonical reference for the CareFlow monorepo layout. Every top-level folder and significant file is annotated. Use this as a map when deciding where new code belongs.

---

## Full Tree with Annotations

```
careflow/                               # Monorepo root – contains workspace config, shared tooling, and CI
├── apps/                               # Deployable applications (each is an independent workspace package)
│   │
│   ├── clinic-web/                     # Next.js 15 – Clinic staff dashboard (deployed to Vercel)
│   │   ├── src/
│   │   │   ├── app/                    # Next.js App Router root – all routes live here
│   │   │   │   │
│   │   │   │   ├── (auth)/             # Route group: unauthenticated flows (no shared layout)
│   │   │   │   │   ├── login/          # /login – email/password sign-in page
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── register/       # /register – clinic onboarding page
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── layout.tsx      # Auth layout: centred card, no sidebar
│   │   │   │   │
│   │   │   │   ├── (dashboard)/        # Route group: protected pages (require authenticated session)
│   │   │   │   │   ├── queue/          # /queue – live queue board with real-time updates via Supabase Realtime
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── loading.tsx # Suspense boundary skeleton
│   │   │   │   │   ├── appointments/   # /appointments – appointment list, booking, and rescheduling
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [id]/       # /appointments/:id – single appointment detail/edit
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── doctors/        # /doctors – doctor roster management (CRUD)
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [id]/       # /doctors/:id – individual doctor profile & schedule
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── settings/       # /settings – clinic profile, operating hours, notification prefs
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── layout.tsx      # Dashboard layout: sidebar + topbar + auth guard
│   │   │   │   │
│   │   │   │   ├── api/                # Next.js Route Handlers (prefer Server Actions; use API routes for webhooks)
│   │   │   │   │   ├── webhooks/       # Inbound webhooks (e.g. Firebase FCM delivery receipts)
│   │   │   │   │   └── health/         # GET /api/health – uptime check endpoint
│   │   │   │   │
│   │   │   │   ├── layout.tsx          # Root layout: sets <html lang>, global fonts, providers
│   │   │   │   ├── page.tsx            # / – landing redirect (sends authed users to /queue, guests to /login)
│   │   │   │   ├── not-found.tsx       # Custom 404 page
│   │   │   │   └── error.tsx           # Global error boundary
│   │   │   │
│   │   │   ├── components/             # Web-only React components (never imported by patient-mobile)
│   │   │   │   ├── queue/              # Queue management UI
│   │   │   │   │   ├── QueueBoard.tsx  # Full-screen live queue display
│   │   │   │   │   ├── QueueCard.tsx   # Single patient card in the queue
│   │   │   │   │   ├── QueueActions.tsx # Call next, mark served, skip buttons
│   │   │   │   │   └── QueueStats.tsx  # Summary stats bar (waiting count, avg wait time)
│   │   │   │   ├── appointments/       # Appointment management UI
│   │   │   │   │   ├── AppointmentTable.tsx  # Sortable, filterable appointments list
│   │   │   │   │   ├── BookingModal.tsx       # New appointment booking dialog
│   │   │   │   │   └── RescheduleModal.tsx    # Reschedule existing appointment
│   │   │   │   └── shared/             # Structural / chrome components
│   │   │   │       ├── Sidebar.tsx     # Main navigation sidebar
│   │   │   │       ├── Topbar.tsx      # Header with clinic name and user menu
│   │   │   │       ├── PageHeader.tsx  # Reusable page title + breadcrumb
│   │   │   │       └── ConfirmDialog.tsx # Generic destructive-action confirmation dialog
│   │   │   │
│   │   │   ├── hooks/                  # Web-specific React hooks
│   │   │   │   ├── useQueue.ts         # Subscribes to queue Realtime channel
│   │   │   │   ├── useAppointments.ts  # Fetches and mutates appointments
│   │   │   │   └── useClinicSession.ts # Reads current clinic context from auth session
│   │   │   │
│   │   │   ├── lib/                    # Initialisation & utility modules (not components)
│   │   │   │   ├── supabase/
│   │   │   │   │   ├── client.ts       # Browser Supabase client (singleton, uses anon key)
│   │   │   │   │   └── server.ts       # Server Supabase client (uses service role key, Server Components only)
│   │   │   │   ├── firebase.ts         # Firebase app init + messaging for web push
│   │   │   │   └── utils.ts            # cn() helper and other web-local utilities
│   │   │   │
│   │   │   ├── store/                  # Zustand global state stores
│   │   │   │   ├── queueStore.ts       # Live queue state (synced from Realtime subscription)
│   │   │   │   └── uiStore.ts          # UI state: sidebar open/closed, active modal, etc.
│   │   │   │
│   │   │   └── types/                  # Web-app-specific TypeScript types (not shared)
│   │   │       └── next-auth.d.ts      # Augments NextAuth session type with clinic fields
│   │   │
│   │   ├── public/                     # Static assets served at root URL
│   │   │   ├── favicon.ico
│   │   │   └── logo.svg
│   │   ├── package.json                # App dependencies and scripts (dev, build, start, lint)
│   │   ├── next.config.ts              # Next.js configuration (transpilePackages for monorepo packages)
│   │   ├── tailwind.config.ts          # Tailwind config (extends root preset, adds app-specific tokens)
│   │   └── tsconfig.json               # Extends root tsconfig, sets path aliases for this app
│   │
│   └── patient-mobile/                 # React Native Expo SDK 52 – Patient-facing app (iOS & Android)
│       ├── src/
│       │   ├── app/                    # Expo Router v3 file-based routing (mirrors Next.js App Router conventions)
│       │   │   │
│       │   │   ├── (auth)/             # Unauthenticated screens
│       │   │   │   ├── login.tsx       # Phone number entry screen
│       │   │   │   ├── otp.tsx         # OTP verification screen
│       │   │   │   └── _layout.tsx     # Auth stack navigator layout
│       │   │   │
│       │   │   ├── (tabs)/             # Bottom tab navigator (shown after login)
│       │   │   │   ├── index.tsx       # Home tab – nearby clinics and quick book
│       │   │   │   ├── appointments.tsx # My Appointments tab – upcoming and past
│       │   │   │   ├── profile.tsx     # Profile tab – account settings, logout
│       │   │   │   └── _layout.tsx     # Tab bar config (icons, labels, active tint)
│       │   │   │
│       │   │   ├── clinic/             # Clinic detail screens (stack, pushed over tabs)
│       │   │   │   ├── [id].tsx        # Clinic detail page – info, doctors, hours
│       │   │   │   ├── [id]/book.tsx   # Appointment booking flow
│       │   │   │   └── [id]/queue.tsx  # Live queue status screen – patient's current position
│       │   │   │
│       │   │   └── _layout.tsx         # Root layout – wraps everything in providers, sets up Expo Router
│       │   │
│       │   ├── components/             # Mobile-specific React Native components
│       │   │   ├── ClinicCard.tsx      # Clinic search result card
│       │   │   ├── QueuePositionBadge.tsx # Large badge showing patient's queue number
│       │   │   └── AppointmentItem.tsx # Row item for appointment list
│       │   │
│       │   ├── hooks/                  # Mobile-specific hooks
│       │   │   ├── useQueuePosition.ts # Realtime subscription for patient's queue slot
│       │   │   └── usePushToken.ts     # Registers device for FCM push notifications
│       │   │
│       │   ├── lib/                    # Initialisation & utility modules
│       │   │   ├── supabase.ts         # Expo Supabase client (uses AsyncStorage for session persistence)
│       │   │   └── notifications.ts    # Firebase messaging setup, permission request, token registration
│       │   │
│       │   ├── store/                  # Zustand stores
│       │   │   ├── authStore.ts        # Patient auth state (user object, session)
│       │   │   └── queueStore.ts       # Current queue position and estimated wait
│       │   │
│       │   └── types/                  # Mobile-app-specific TypeScript types
│       │       └── expo.d.ts           # Augments Expo environment types
│       │
│       ├── assets/                     # Static assets bundled into the app binary
│       │   ├── fonts/                  # Custom fonts loaded via expo-font
│       │   ├── images/                 # App icon, splash screen, in-app images
│       │   └── icons/                  # SVG/PNG icon overrides
│       ├── app.json                    # Expo project config (name, slug, bundle IDs, permissions, plugins)
│       ├── babel.config.js             # Babel config (extends expo preset, adds module-resolver for aliases)
│       └── package.json                # App dependencies (expo, react-native, etc.) and scripts
│
├── packages/                           # Internal shared libraries – published to no registry, referenced by workspace
│   │
│   ├── ui/                             # Shared UI component library
│   │   ├── src/
│   │   │   ├── components/             # ShadCN-derived components adapted for potential cross-platform use
│   │   │   │   ├── Button.tsx          # Base button with variant/size props
│   │   │   │   ├── Badge.tsx           # Status badge (maps to queue/appointment status colours)
│   │   │   │   └── Spinner.tsx         # Loading indicator
│   │   │   └── primitives/             # Unstyled base primitives (behaviour only, no visual styling)
│   │   │       └── Pressable.tsx       # Cross-platform pressable abstraction
│   │   ├── package.json                # name: "@careflow/ui"
│   │   └── tsconfig.json
│   │
│   ├── shared/                         # Shared business logic – zero runtime dependencies on any framework
│   │   ├── src/
│   │   │   ├── types/                  # All shared TypeScript interfaces, types, and enums
│   │   │   │   ├── index.ts            # Re-exports all types for clean single-import access
│   │   │   │   ├── clinic.ts           # Clinic, Doctor, OperatingHours interfaces
│   │   │   │   ├── appointment.ts      # Appointment, AppointmentStatus enum, BookingSlot
│   │   │   │   ├── queue.ts            # Queue, QueueEntry, QueueStatus enum, QueuePriority enum
│   │   │   │   └── user.ts             # PatientProfile, ClinicStaff, Role enum
│   │   │   ├── constants/              # App-wide constant values (never hardcode these in app code)
│   │   │   │   ├── index.ts            # Re-exports all constants
│   │   │   │   └── queue.ts            # QUEUE_STATUS_LABELS, PRIORITY_WEIGHTS, MAX_QUEUE_SIZE, etc.
│   │   │   └── utils/                  # Pure functions with no side effects (easy to unit test)
│   │   │       ├── date.ts             # Date/time helpers (all output in Malaysia Time, UTC+8)
│   │   │       │                       #   formatMYT(), toMYTISOString(), isToday(), getSlotLabel()
│   │   │       ├── queue.ts            # Queue calculation utilities
│   │   │       │                       #   estimateWaitTime(), sortByPriority(), getQueuePosition()
│   │   │       └── validation.ts       # Zod schemas for all shared domain objects
│   │   │                               #   appointmentSchema, bookingSchema, clinicSchema
│   │   ├── package.json                # name: "@careflow/shared"
│   │   └── tsconfig.json
│   │
│   └── database/                       # Supabase integration layer – typed query builders and client factory
│       ├── src/
│       │   ├── client.ts               # Supabase client factory – accepts env vars, returns typed client
│       │   │                           # Use this instead of creating clients directly in apps
│       │   ├── types/                  # Auto-generated Supabase TypeScript types
│       │   │   └── supabase.ts         # Generated via: supabase gen types typescript --project-id ...
│       │   │                           # DO NOT edit manually – regenerate when schema changes
│       │   ├── queries/                # Typed, reusable query builders (thin wrappers over Supabase JS client)
│       │   │   ├── appointments.ts     # getAppointments(), createAppointment(), updateAppointmentStatus()
│       │   │   ├── clinics.ts          # getClinic(), searchClinics(), updateClinicSettings()
│       │   │   ├── doctors.ts          # getDoctors(), getDoctorAvailability()
│       │   │   └── queues.ts           # getActiveQueue(), addToQueue(), advanceQueue(), getQueueEntry()
│       │   └── migrations/             # Migration helper types (not SQL – SQL lives in supabase/migrations/)
│       │       └── types.ts            # TypeScript types for migration metadata
│       ├── package.json                # name: "@careflow/database"
│       └── tsconfig.json
│
├── supabase/                           # Supabase project configuration and backend assets
│   ├── migrations/                     # SQL migration files – auto-applied in timestamp order
│   │   ├── 20240101000000_init.sql     # Initial schema: clinics, doctors, patients
│   │   ├── 20240102000000_queues.sql   # Queue and queue_entries tables + RLS policies
│   │   └── 20240103000000_appointments.sql  # Appointments table + RLS policies
│   ├── functions/                      # Supabase Edge Functions (Deno runtime, deployed globally)
│   │   ├── notify-patient/             # Sends FCM push when queue position changes
│   │   │   └── index.ts
│   │   └── send-appointment-reminder/  # Sends push/SMS 30 min before appointment
│   │       └── index.ts
│   ├── seeds/                          # Development seed data (not run in production)
│   │   ├── 01_clinics.sql              # Sample clinic + doctor records
│   │   └── 02_appointments.sql         # Sample appointments and queue entries
│   └── config.toml                     # Supabase CLI local dev configuration (ports, auth settings, etc.)
│
├── docs/                               # Project documentation
│   ├── Architecture.md                 # System architecture overview, data flow diagrams
│   ├── ERD.md                          # Entity-Relationship Diagram for the database schema
│   ├── Setup.md                        # Installation and development setup guide (this repo's onboarding doc)
│   ├── FolderStructure.md              # This file
│   ├── CodingStandards.md              # ESLint rules, formatting conventions, commit message format
│   └── EnvironmentVariables.md         # All .env variables documented with descriptions and examples
│
├── package.json                        # Root workspace package.json – defines pnpm scripts and Turborepo tasks
├── pnpm-workspace.yaml                 # Declares workspace members: apps/*, packages/*
├── turbo.json                          # Turborepo pipeline config: task dependency graph, caching rules
└── tsconfig.json                       # Root TypeScript config – all app/package tsconfigs extend this
```

---

## Naming Conventions by Layer

Consistent naming reduces cognitive overhead when navigating the monorepo. Follow these conventions for all new files.

### React Components (`.tsx`)

Use **PascalCase** for all component files. The filename must match the exported component name exactly.

| Layer | Example File | Exported Name |
|---|---|---|
| App page | `apps/clinic-web/src/app/(dashboard)/queue/page.tsx` | `export default function QueuePage()` |
| Feature component | `src/components/queue/QueueBoard.tsx` | `export function QueueBoard()` |
| Shared UI (packages/ui) | `packages/ui/src/components/Badge.tsx` | `export function Badge()` |
| Mobile screen | `apps/patient-mobile/src/app/(tabs)/index.tsx` | `export default function HomeScreen()` |

### Hooks (`.ts`)

Prefix with `use`, camelCase, co-located with the app that uses them.

```
useQueue.ts           # reads and subscribes to queue state
useAppointments.ts    # fetches and mutates appointments
useQueuePosition.ts   # mobile: watches patient's live position
usePushToken.ts       # mobile: manages FCM device token
```

### Zustand Stores (`.ts`)

Suffix with `Store`, camelCase.

```
queueStore.ts         # export const useQueueStore = create(...)
uiStore.ts            # export const useUIStore = create(...)
authStore.ts          # export const useAuthStore = create(...)
```

### Utility Functions (`.ts`)

Kebab-case or camelCase file name, no suffix. Functions inside are camelCase.

```
packages/shared/src/utils/date.ts        # formatMYT(), toMYTISOString()
packages/shared/src/utils/queue.ts       # estimateWaitTime(), sortByPriority()
packages/shared/src/utils/validation.ts  # appointmentSchema (Zod)
```

### Type Files (`.ts`)

Singular noun, camelCase. Types and interfaces use PascalCase. Enums use PascalCase with PascalCase members.

```
packages/shared/src/types/clinic.ts       # interface Clinic, interface Doctor
packages/shared/src/types/appointment.ts  # interface Appointment, enum AppointmentStatus
packages/shared/src/types/queue.ts        # interface QueueEntry, enum QueuePriority
```

Enum example:
```typescript
// packages/shared/src/types/queue.ts
export enum QueueStatus {
  Waiting   = 'waiting',
  Called    = 'called',
  Serving   = 'serving',
  Completed = 'completed',
  Skipped   = 'skipped',
}
```

### Database Query Files (`.ts`)

Named after the resource (plural), camelCase functions.

```
packages/database/src/queries/queues.ts         # getActiveQueue(), addToQueue()
packages/database/src/queries/appointments.ts   # getAppointments(), createAppointment()
```

### Constants Files (`.ts`)

Named after the domain (singular or plural), camelCase or SCREAMING_SNAKE_CASE for the exported values.

```
packages/shared/src/constants/queue.ts
// exports: QUEUE_STATUS_LABELS, PRIORITY_WEIGHTS, MAX_QUEUE_SIZE
```

### SQL Migration Files

Prefix with a UTC timestamp, underscore-separated description, `.sql` extension.

```
20240101000000_init.sql
20240115123000_add_queue_priority_column.sql
```

### Supabase Edge Functions

Directory name in kebab-case. Entry point is always `index.ts`.

```
supabase/functions/notify-patient/index.ts
supabase/functions/send-appointment-reminder/index.ts
```

---

## Import Aliases

Path aliases avoid brittle `../../../` relative imports. They are defined in `tsconfig.json` files and (for Expo) in `babel.config.js`.

### Root `tsconfig.json` (base, not used directly)

```json
{
  "compilerOptions": {
    "paths": {
      "@careflow/shared":   ["../../packages/shared/src/index.ts"],
      "@careflow/database": ["../../packages/database/src/index.ts"],
      "@careflow/ui":       ["../../packages/ui/src/index.ts"]
    }
  }
}
```

### `apps/clinic-web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@/*":                ["./src/*"],
      "@/components/*":     ["./src/components/*"],
      "@/hooks/*":          ["./src/hooks/*"],
      "@/lib/*":            ["./src/lib/*"],
      "@/store/*":          ["./src/store/*"],
      "@/types/*":          ["./src/types/*"],
      "@careflow/shared":   ["../../packages/shared/src/index.ts"],
      "@careflow/database": ["../../packages/database/src/index.ts"],
      "@careflow/ui":       ["../../packages/ui/src/index.ts"]
    }
  }
}
```

### `apps/patient-mobile/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@/*":                ["./src/*"],
      "@/components/*":     ["./src/components/*"],
      "@/hooks/*":          ["./src/hooks/*"],
      "@/lib/*":            ["./src/lib/*"],
      "@/store/*":          ["./src/store/*"],
      "@/types/*":          ["./src/types/*"],
      "@careflow/shared":   ["../../packages/shared/src/index.ts"],
      "@careflow/database": ["../../packages/database/src/index.ts"],
      "@careflow/ui":       ["../../packages/ui/src/index.ts"]
    }
  }
}
```

> Expo (Metro bundler) requires aliases to also be declared in `babel.config.js` using `babel-plugin-module-resolver`. The `tsconfig.json` aliases cover TypeScript type resolution; the Babel plugin handles runtime module resolution.

```javascript
// apps/patient-mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@':             './src',
            '@/components':  './src/components',
            '@/hooks':       './src/hooks',
            '@/lib':         './src/lib',
            '@/store':       './src/store',
            '@/types':       './src/types',
          },
        },
      ],
    ],
  };
};
```

### Usage Examples

```typescript
// Instead of:
import { QueueStatus } from '../../../packages/shared/src/types/queue';
import { getActiveQueue } from '../../../packages/database/src/queries/queues';

// Use:
import { QueueStatus } from '@careflow/shared';
import { getActiveQueue } from '@careflow/database';

// Within clinic-web:
import { QueueBoard } from '@/components/queue/QueueBoard';
import { useQueue } from '@/hooks/useQueue';
import { supabase } from '@/lib/supabase/client';
import { useQueueStore } from '@/store/queueStore';
```
