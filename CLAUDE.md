# CareFlow — Claude Instructions

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
- No real clinic/doctor photos in DB — use colored placeholder Views based on name hash (6 preset colors, show initial letter)

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

Status actions (Check In, Complete, No Show, Cancel) use `useTransition` for non-blocking updates.

### Auth
`requireRole(roles[])` in `src/lib/auth.ts` — returns user with `clinicId`. Staff roles: `doctor`, `receptionist`, `clinic_admin`, `super_admin`.

---

## Supabase / Database

### Pending Migrations (not yet applied)
These two migrations were written but must be run manually in the Supabase SQL Editor:
- `supabase/migrations/20260620000000_doctor_breaks.sql` — doctor break slots
- `supabase/migrations/20260620000001_book_appointment_fn.sql` — `book_appointment()` stored function

### Key Tables
| Table | Purpose |
|---|---|
| `profiles` | Patient user data (1:1 with auth.users) |
| `clinics` | Clinic tenant records |
| `clinic_staff` | Staff–clinic join table with role |
| `doctors` | Doctor extended profile (1:1 with clinic_staff) |
| `doctor_schedules` | Weekly recurring availability |
| `time_slots` | Individual bookable slots (generated from schedules) |
| `appointments` | Patient bookings |
| `queues` | Daily queue per doctor |
| `queue_entries` | Individual patient queue positions |
| `notifications` | Push notification audit log (insert via service_role only) |

### RLS Key Facts
- All clinic-scoped tables have `clinic_id` + RLS policies
- `auth.clinic_id()` helper reads from JWT `app_metadata.clinic_id`
- `service_role` key only in Edge Functions — never in client code
- `anon` key only for public clinic directory reads

### Timezone
All dates use Malaysian time (MYT, UTC+8). Use `getMYTToday()` from `@careflow/shared` for the current date string.

---

## Shared Package (`packages/shared`)

- `getMYTToday()` — returns today's date as `YYYY-MM-DD` in MYT
- Slot engine utilities
- Shared TypeScript types

---

## Common Pitfalls

1. **Never import `Ionicons` directly** in patient-mobile — use `Icon` wrapper
2. **`clinics.phoneNumber`** (not `clinics.phone`) — camelCase field name
3. **pnpm workspace hoisting** — `@types/react@19` bleeds from clinic-web; `skipLibCheck: true` in patient-mobile tsconfig mitigates most issues
4. **Realtime requires manual setup** — enable `queue_entries` and `queues` tables in Supabase Realtime settings + `ALTER TABLE queue_entries REPLICA IDENTITY FULL`
5. **`book_appointment()` is a stored function** — call via `supabase.rpc('book_appointment', {...})`, not direct insert
6. **Doctor name** is in `auth.users` / `profiles`, not in `doctors` table — always join through `clinic_staff → users`
7. **Ratings and geolocation** are not in the DB — placeholders (4.8★, distances) are hardcoded in the UI
