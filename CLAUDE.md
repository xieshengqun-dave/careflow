# CareFlow — Claude Instructions

## Product Mission

CareFlow is an **AI-powered Hybrid Appointment & Queue Optimization platform** targeting private dental clinics in Malaysia.

**Mission:** Increase clinic productivity by reducing waiting time, minimizing no-shows, and automatically optimizing appointment schedules.

### In Scope
1. Appointment Scheduling
2. Queue Management
3. AI Queue Optimization
4. Patient Communication
5. Analytics

### Out of Scope — Do NOT build these
- Inventory management
- Accounting / billing
- Payroll
- Electronic Medical Records (EMR)

---

## Engineering Principles

**Mission:** Build the best AI-powered Patient Flow Management platform for Malaysian dental clinics.

### Always optimise for
- Receptionist productivity
- Chair utilisation
- Patient experience
- Simplicity

### Never add features that
- Duplicate EMR functionality
- Duplicate accounting systems
- Increase receptionist workload

### Before implementing any feature
1. Review existing architecture
2. Reuse existing components
3. Explain the implementation plan
4. Update documentation
5. Add tests where appropriate

Every commit must leave the project in a deployable state.
---

## Project Overview
Malaysian clinic queue and appointment management platform. Monorepo: `apps/clinic-web` (Next.js 15) + `apps/patient-mobile` (Expo 52) + `packages/shared`.

**Key external dependency:** Supabase project — Postgres + Auth (phone OTP) + Realtime + RLS. All data isolation is enforced via Row-Level Security at the DB layer.

---

## Monorepo Layout

```
CareFlow/
├── apps/
│   ├── clinic-web/          # Next.js 15 App Router — clinic staff dashboard
│   └── patient-mobile/      # Expo SDK 52 + Expo Router — patient app
├── packages/
│   ├── shared/src/           # getMYTToday(), slot engine, shared types
│   └── database/             # Supabase generated types (not heavily used)
├── supabase/
│   └── migrations/           # All SQL — run in Supabase SQL Editor
└── UI/                       # PNG mockups for every patient-mobile screen
```

---

## Patient Mobile App (`apps/patient-mobile`)

### Critical: Ionicons Type Workaround
**Never import `Ionicons` directly.** pnpm hoists `@types/react@19` from `clinic-web` into the mobile TypeScript context, causing a `ReactNode/bigint` incompatibility with `@expo/vector-icons` class component types.

Always use the wrapper:
```typescript
import { Icon } from "@/components/Icon";
// <Icon name="home-outline" size={24} color="#1A6FD8" />
```

`Icon` is `Ionicons as unknown as React.FC<{ name: string; size?: number; color?: string; style?: unknown }>`.

### Design System
- **Primary color:** `#1A6FD8`
- **Design tokens:** `src/constants/theme.ts` — Colors, FontSize, FontWeight, Spacing, Radius, Shadow
- **Mockups:** `/UI/*.png` — match these exactly for all screens
- **Logo:** `assets/images/logo.png` (copied from `/UI/logo.png`) — also used to generate `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png` (referenced by `app.json`). If the logo changes, regenerate these.
- No real clinic/doctor photos in DB — use colored placeholder Views based on name hash (6 preset colors, show initial letter)

### Critical: SafeAreaView must come from `react-native-safe-area-context`
**Never import `SafeAreaView` from `"react-native"`.** The core RN component is iOS-only and is a no-op on Android, causing headers to render under the status bar. Always:
```typescript
import { SafeAreaView } from "react-native-safe-area-context";
```
The root layout (`src/app/_layout.tsx`) wraps everything in `<SafeAreaProvider>` for this to work. For header-only wrappers (not full-screen), pass `edges={["top"]}` so it doesn't also eat a bottom inset.

### Navigation (Expo Router)
```
src/app/
├── _layout.tsx              # Root: SplashScreen hide, auth redirect
├── (auth)/
│   ├── login.tsx            # Phone + OTP login
│   └── otp.tsx              # OTP verification
├── (tabs)/
│   ├── _layout.tsx          # 5 tabs: Home, Appointments, Check-in (FAB), Queue/Notifs, Profile
│   ├── index.tsx            # Home
│   ├── appointments.tsx     # My Appointments
│   ├── checkin.tsx          # Check-in placeholder
│   ├── notifications.tsx    # Notifications (derived from appts + queue)
│   └── profile.tsx          # Profile
├── clinic/
│   ├── search.tsx           # Find Clinics
│   └── [clinicId].tsx       # Clinic Details
├── booking/
│   ├── [doctorId].tsx       # Doctor Schedule + slot picker
│   └── confirm.tsx          # Booking Confirmation
└── queue/
    ├── join.tsx             # Join Queue screen
    └── [queueId].tsx        # Live Queue Tracking (Realtime subscription)
```

### Tab Bar: Elevated Center FAB
Tab 3 (`checkin`) uses a `tabBarButton` override — a `TouchableOpacity` wrapping a `View` with `marginTop: -18` to produce the elevated scan button. Do not restructure this.

### Auth Store
`src/store/authStore.ts` — Zustand store with `user`, `session`, `isLoading`, `signOut()`.

### API Layer
```
src/lib/api/
├── appointments.ts   # getMyAppointments, bookAppointment, cancelAppointment
├── clinics.ts        # searchClinics, getClinicWithDoctors
├── notifications.ts  # getDerivedNotifications() — derived from appts + queue_entries
├── queues.ts         # getClinicActiveQueues, joinQueue, getQueueEntryStatus, leaveQueue
└── slots.ts          # getDoctorAvailableSlots
```

**Notifications are derived, not stored separately** — `getDerivedNotifications()` fetches upcoming appointments + active queue entries (CALLED/IN_CONSULTATION) and synthesizes `AppNotification[]`.

### Realtime
Queue tracking (`queue/[queueId].tsx`) subscribes to `queue_entries` table filtered by `id = queueId`. Enable Realtime on `queue_entries` and `queues` in Supabase dashboard.

---

## Clinic Web App (`apps/clinic-web`)

### Stack
Next.js 15 App Router, React 19, Tailwind CSS, ShadCN UI. Server Components + Server Actions pattern — no separate API routes.

### Key Directories
```
src/
├── app/(dashboard)/
│   ├── appointments/        # Appointments page (slot view + list view)
│   ├── dashboard/           # Metrics dashboard
│   ├── doctors/             # Doctor CRUD
│   ├── queue/               # Queue management board
│   ├── schedules/           # Doctor schedule management
│   └── settings/            # Clinic settings
├── components/
│   ├── scheduling/          # AppointmentList, ScheduleBoard, SlotGrid
│   ├── queue/               # QueueBoard, QueueCard
│   ├── doctors/             # Doctor forms, DoctorCard
│   └── shared/              # Shared UI pieces
├── lib/
│   ├── actions/             # Server Actions: appointments.ts, doctors.ts, queue.ts, schedules.ts, settings.ts
│   ├── queries/             # Server-side queries: appointments.ts, dashboard.ts, queue.ts, slots.ts
│   ├── supabase/            # Supabase browser/server clients
│   └── auth.ts              # requireRole() — enforces staff auth + role
```

### Appointments Page
Has two views toggled via `?view=` param:
- `?view=slots` → `ScheduleBoard` (doctor slot grid)
- `?view=list` → `AppointmentList` (grouped by doctor, inline status actions)

Status actions (Check In, Complete, No Show, Cancel, **Reschedule**) use `useTransition` for non-blocking updates. **Reschedule** opens `RescheduleDialog` which picks a new slot for the same doctor and atomically frees the old slot. Overdue appointments (CONFIRMED + 15 min past slot time) show amber highlighting and a batch "Mark No Show" sweep button.

### Queue Management Page (`/queue`)
Now a **Reception Command Centre** — the single screen receptionists use all day:

- **Quick Check-in bar** (top): type a 6-char appointment code or phone number to check in instantly. This is how the 6-char code shown on the patient Check-In screen is consumed. Implemented in `components/queue/QuickCheckIn.tsx`.
- **Emergency button**: opens a minimal overlay (name only, no phone required), creates a guest profile, places patient at priority 1 (front of queue automatically). In `components/queue/EmergencyButton.tsx`.
- **Per-doctor columns** (`DoctorQueueColumns.tsx`): one card column per active doctor, side by side. Shows IN_CONSULTATION / CALLED / WAITING with color coding. Per-column "Call Next" button.
- **Detail panel**: click any patient row to open. Includes: Call (specific), Arrived, Complete Consultation, Move to Top, Skip, Requeue, Remove, **Reassign to Doctor** (dropdown — moves patient to another queue atomically), Pause/Resume queue, Notify delayed.
- **Walk-in dialog** (`AddWalkInDialog.tsx`): phone is now optional. Doctor selector shows live queue depth ("Dr. Ahmad (3 waiting)"). Treatment type quick-select pills.

### Auth
`requireRole(roles[])` in `src/lib/auth.ts` — returns user with `clinicId`. Staff roles: `doctor`, `receptionist`, `clinic_admin`, `super_admin`. Auth is email+password (`supabase.auth.signInWithPassword`), not OTP — that's patient-mobile only. Seed accounts in `supabase/seed.sql` have an **empty password**, so they can't actually sign in until a password is set via Supabase Dashboard → Authentication → Users → Reset Password.

### Dashboard (`/dashboard`)
Rebuilt to match the `/UI/Clinic Dashboard.png` mockup: metric cards (Today's Appointments, In Queue, Patients Today, Completed Today — swapped the mockup's "Revenue Today" since there's no fee column in the schema), a live queue breakdown donut (`recharts`), today's appointments list, doctor schedule, a status bar chart, and a real recent-activity feed built from `updated_at` timestamps. All data is real — no fabricated numbers. Logic lives in `src/lib/queries/dashboard.ts`; components in `src/components/dashboard/`.

### Platform Console (`/platform/*`)
Route group `apps/clinic-web/src/app/(platform)/` — gated to `super_admin` only. Layout redirects `clinic_admin`/`doctor`/`receptionist` back to `/dashboard`.

```
/platform/
├── overview/        # Aggregate metrics (total clinics, doctors, patients, appts today)
├── clinics/         # All clinics list with per-clinic stats
│   └── [clinicId]/ # Clinic detail: stats + StaffPasswordManager (role + password reset)
├── doctors/         # Doctor list — requires ?clinic= selector
├── patients/        # Patient list — requires ?clinic= selector
└── staff/           # Platform admins only (from platform_admins table, NOT clinic_staff)
```

**Key rules for platform queries:**
- Always use `createAdminClient()` — platform admins have no `clinic_id` in their JWT, so `createServerClient()` is blocked by RLS on all clinic-scoped tables and silently returns empty
- Staff management (`getClinicStaff`, `setStaffRole`) use `createAdminClient()` and scope by explicit `clinic_id`
- The `/platform/staff` page shows only `platform_admins` table entries — NOT `clinic_staff` rows
- Clinic staff management lives under `/platform/clinics/[clinicId]` — the `StaffPasswordManager` component handles role changes + password resets

**`StaffPasswordManager`** (`components/settings/StaffPasswordManager.tsx`):
- Shows per-staff expandable rows with role pills (Doctor/Receptionist/Clinic Admin) + password fields
- `setStaffRole()` and `setStaffPassword()` are server actions in `lib/actions/settings.ts`
- Only DOCTOR, RECEPTIONIST, CLINIC_ADMIN roles shown — SUPER_ADMIN rows filtered out

### Tailwind requires `postcss.config.mjs`
`apps/clinic-web/postcss.config.mjs` (tailwindcss + autoprefixer) is required for the `@tailwind` directives in `globals.css` to compile — without it, the whole app renders with zero CSS. Don't delete it.

---

## Supabase / Database

### Applied Migrations (all current as of 2026-06-29)
All migrations have been applied to the live Supabase project:
- `supabase/migrations/20260620000000_doctor_breaks.sql` — doctor break slots ✅
- `supabase/migrations/20260620000001_book_appointment_fn.sql` — `book_appointment()` patient function ✅
- `supabase/migrations/20260626000001_staff_book_appointment_fn.sql` — `staff_book_appointment()` for staff-initiated bookings ✅
- `supabase/migrations/20260626000002_reschedule_appointment_fn.sql` — `reschedule_appointment()` for patient reschedule flow ✅
- `supabase/migrations/20260629000001_platform_admins.sql` — `platform_admins` table, seeds `admin@careflow.asia` ✅
- `supabase/migrations/20260629000002_treatment_type.sql` — `treatment_type TEXT` on `appointments` + `queue_entries` ✅
- `supabase/migrations/20260629000003_smart_queue_foundation.sql` — smart queue fields, `doctor_treatment_stats`, `record_consultation_complete()` RPC ✅

### Pending Migrations (written, NOT yet run in Supabase SQL Editor)
- `supabase/migrations/20260701000002_treatment_templates.sql` — application not confirmed; templates UI falls back gracefully without it
- `supabase/migrations/20260701000003_chairs.sql` — chair grid stays hidden and chair assignment no-ops without it
- `supabase/migrations/20260902000001_profiles_rls_tighten.sql` — until applied, the profiles PII leak remains open (any clinic staff can read every patient); code already prefers the new RPC and falls back to direct reads

### Key Tables
| Table | Purpose |
|---|---|
| `profiles` | Patient user data (1:1 with auth.users) |
| `clinics` | Clinic tenant records |
| `clinic_staff` | Staff–clinic join table with role |
| `doctors` | Doctor extended profile (1:1 with clinic_staff) |
| `doctor_schedules` | Weekly recurring availability |
| `time_slots` | Individual bookable slots (generated from schedules) |
| `appointments` | Patient bookings (now includes `treatment_type`, `estimated_duration_minutes`) |
| `queues` | Daily queue per doctor |
| `queue_entries` | Individual patient queue positions (now includes `estimated_duration_minutes`, `actual_duration_minutes`, `scheduled_start_time`, `arrival_status`) |
| `doctor_treatment_stats` | Per-doctor historical consultation durations by treatment type — feeds queue engine and future AI |
| `notifications` | Push notification audit log (insert via service_role only) |

### RLS Key Facts
- All clinic-scoped tables have `clinic_id` + RLS policies
- `auth.clinic_id()` helper reads from JWT `app_metadata.clinic_id`
- `service_role` key only in Edge Functions — never in client code
- `anon` key only for public clinic directory reads
- **`profiles` staff read is relationship-scoped** (migration `20260902000001`): staff only see patients with an appointment or queue entry at their clinic (`staff_can_view_patient()` SECURITY DEFINER helper). Never add a new direct global `profiles` read with the server client — use `findPatientByPhone()` in `apps/clinic-web/src/lib/patients.ts`, which calls the audited `staff_lookup_patient_by_phone()` RPC (exact phone match, returns only id + full_name, logs to `activity_log`)

### Timezone
All dates use Malaysian time (MYT, UTC+8). Use `getMYTToday()` from `@careflow/shared` for the current date string.

### No fee/price column anywhere in the schema
Neither `appointments` nor `doctors` has a fee/price column (checked all migrations). Don't `select` `consultation_fee` or similar — Postgrest will error on the unknown column and the **entire query silently returns no rows**. (`queue/join.tsx` had this bug — selecting `consultation_fee` and filtering `queues.status` instead of `queues.is_active` — fixed in Phase 3/4; it now selects `consultation_duration_minutes` and shows the fee as a "—" placeholder.) If you need real revenue/fee data, add a migration first rather than fabricating a number.

### `profiles.phone_number` (not `profiles.phone`)
The column is `phone_number`, not `phone`. Using `.eq("phone", ...)` or selecting `profiles(phone)` silently returns no rows from Postgrest. Fixed in `queries/appointments.ts` and `actions/appointments.ts` (2026-06-29). If you add any new query touching `profiles`, always use `phone_number`.

### Guest profiles (walk-in and emergency patients)
`addWalkIn()` with an empty phone creates a guest auth user with a generated email (`guest.{timestamp}@careflow.internal`). These accounts cannot log in. They exist solely to satisfy the `profiles.id REFERENCES auth.users(id)` FK. Emergency patients created via `addEmergency()` follow the same pattern. Do not try to look up these users by phone — they have none.

### Smart Queue fields + `doctor_treatment_stats`
After `20260629000003_smart_queue_foundation.sql`:
- `queue_entries` gains: `estimated_duration_minutes`, `actual_duration_minutes`, `scheduled_start_time`, `arrival_status`
- `appointments` gains: `estimated_duration_minutes`
- New table `doctor_treatment_stats(doctor_id, treatment_type, ...)` — auto-updated by `record_consultation_complete()` RPC
- Queue engine lives in `packages/shared/src/utils/queueEngine.ts` — pure functions, no DB access
- `completeConsultation()` action calls `record_consultation_complete` RPC (falls back to direct update if RPC not found)
- Check-in actions enrich the queue entry with `arrival_status` + `estimated_duration_minutes` immediately after `check_in_appointment` RPC returns the entry UUID

---

## Shared Package (`packages/shared`)

- `getMYTToday()` — returns today's date as `YYYY-MM-DD` in MYT
- Slot engine utilities
- Shared TypeScript types
- **Queue engine** (`utils/queueEngine.ts`) — `computeQueueEstimates()`, `classifyArrival()`, `getEstimatedDuration()`, `computeActualDuration()`, `rankQueueEntries()` (AI hook), `DEFAULT_TREATMENT_DURATIONS`, `FALLBACK_DURATION_MINUTES`, `DoctorDurationProfile` interface

---

## Common Pitfalls

1. **Never import `Ionicons` directly** in patient-mobile — use `Icon` wrapper
2. **`clinics.phoneNumber`** (not `clinics.phone`) — camelCase field name
3. **pnpm workspace hoisting** — `@types/react@19` bleeds from clinic-web; `skipLibCheck: true` in patient-mobile tsconfig mitigates most issues
4. **Realtime requires manual setup** — enable `queue_entries` and `queues` tables in Supabase Realtime settings + `ALTER TABLE queue_entries REPLICA IDENTITY FULL`
5. **`book_appointment()` is a stored function** — call via `supabase.rpc('book_appointment', {...})`, not direct insert
6. **Doctor name** is in `auth.users` / `profiles`, not in `doctors` table — always join through `clinic_staff → users`
7. **Ratings and geolocation** are not in the DB — placeholders (4.8★, distances) are hardcoded in the UI
8. **`SafeAreaView` must come from `react-native-safe-area-context`**, never `"react-native"` core — see Patient Mobile App section above
9. **No fee/price column in the schema** — never `select` `consultation_fee`; see Database section above
10. **patient-mobile Login (`(auth)/login.tsx`) is a dev-mode stub** — it calls `supabase.auth.signInWithPassword()` with a hardcoded dev account instead of the real phone-OTP flow, and never navigates to `otp.tsx`. The OTP screen itself works if reached directly (`/​(auth)/otp?phone=...`), but real OTP login is not wired up yet.
11. **clinic-web requires `apps/clinic-web/postcss.config.mjs`** to exist or Tailwind produces zero CSS — see Clinic Web App section above
12. **`profiles.phone_number`** (not `profiles.phone`) — see Database section above; using the wrong column silently returns no rows
13. **Walk-in + emergency guest profiles** — patients added without a phone get a generated `guest.{timestamp}@careflow.internal` auth user. Do not query by phone for these users. See Database section above.
14. **Quick check-in appointment code** — is last 6 hex chars of the appointment UUID: `id.replace(/-/g,"").slice(-6).toUpperCase()`. Staff enter this into the Quick Check-in bar on the Queue page to check patients in without navigation.
15. **Platform admin cross-clinic queries MUST use `createAdminClient()`** — `createServerClient()` respects RLS. Platform admins have no `clinic_id` in their JWT, so every `clinic_staff` read via the regular server client silently returns empty (no error, just no rows). Always use `createAdminClient()` in any server action that reads clinic-scoped tables for a platform admin.
16. **`scopeClinicId ?? user.clinicId` — not the reverse — in platform functions** — If `admin@careflow.asia` is also in `clinic_staff` (e.g., with `role = SUPER_ADMIN`), `getServerUser()` may return with a non-null `clinicId` from that staff row. Using `user.clinicId ?? scopeClinicId` then silently ignores the URL param and scopes every page to that one wrong clinic. Always write `scopeClinicId ?? user.clinicId` so the explicit URL param wins over the session context.
17. **Platform admin may exist in both `platform_admins` AND `clinic_staff`** — `getServerUser()` checks `platform_admins` first and returns `clinicId: null` if found. But if the `platform_admins` row is missing (migration ran before the auth user was created) and there is a `clinic_staff` row for the same user, the fallback branch returns `clinicId = (that staff row's clinic_id)`. Seed `platform_admins` **after** creating the auth user in Supabase Dashboard, or re-run the seeding INSERT manually.
18. **STAFF_ROLE_MAP includes SUPER_ADMIN → "super_admin"** — so a `clinic_staff` row with `role = 'SUPER_ADMIN'` passes the `requireRole(["super_admin"])` check and leaks `clinicId` from that row. Filter it out of staff management queries with `.in("role", ["DOCTOR", "RECEPTIONIST", "CLINIC_ADMIN"])`.
19. **Debug filtering bugs with `console.log` first** — when a Supabase query returns wrong data, log `targetClinicId`, `data?.length`, and the Supabase `error` before changing filter logic. The real causes are almost always: RLS silently blocking (empty result, no thrown error), wrong `??` operand order, or wrong client type. Don't assume the query builder chaining is broken without logging first.
