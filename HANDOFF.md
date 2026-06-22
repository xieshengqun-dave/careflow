# CareFlow — Session Handoff

**Last updated:** 2026-06-20  
**Branch:** `main`

---

## What Was Built This Session

### Patient Mobile App — Full Rebuild (12 screens)

All screens were rebuilt from scratch to exactly match the PNG mockups in `/UI/`.

| Screen | File | Status |
|---|---|---|
| Login | `(auth)/login.tsx` | ✅ Done |
| OTP Verification | `(auth)/otp.tsx` | ✅ Done |
| Home | `(tabs)/index.tsx` | ✅ Done |
| Check-in | `(tabs)/checkin.tsx` | ✅ Done |
| My Appointments | `(tabs)/appointments.tsx` | ✅ Done |
| Notifications | `(tabs)/notifications.tsx` | ✅ Done |
| Profile | `(tabs)/profile.tsx` | ✅ Done |
| Find Clinics | `clinic/search.tsx` | ✅ Done |
| Clinic Details | `clinic/[clinicId].tsx` | ✅ Done |
| Doctor Schedule (Booking) | `booking/[doctorId].tsx` | ✅ Done |
| Booking Confirmation | `booking/confirm.tsx` | ✅ Done |
| Join Queue | `queue/join.tsx` | ✅ Done |
| Queue Tracking (Live) | `queue/[queueId].tsx` | ✅ Done |
| Tab Layout (5-tab + FAB) | `(tabs)/_layout.tsx` | ✅ Done |
| Root Layout | `_layout.tsx` | ✅ Done |

**New shared files created:**
- `src/components/Icon.tsx` — Ionicons type-cast wrapper (critical, see CLAUDE.md)
- `src/constants/theme.ts` — Full design token system
- `src/lib/api/appointments.ts` — Patient-facing appointment API
- `src/lib/api/clinics.ts` — Clinic search + details API
- `src/lib/api/queues.ts` — Queue join/track/leave API
- `src/lib/api/slots.ts` — Doctor time slot fetching
- `src/lib/api/notifications.ts` — Derived notifications (from appointments + queue_entries)

### Clinic Web App — Appointment Module

| Feature | Files | Status |
|---|---|---|
| Appointment list query | `src/lib/queries/appointments.ts` | ✅ Done |
| Appointment actions | `src/lib/actions/appointments.ts` | ✅ Done |
| AppointmentList component | `src/components/scheduling/AppointmentList.tsx` | ✅ Done |
| Appointments page (slot + list view) | `src/app/(dashboard)/appointments/page.tsx` | ✅ Done |

### Supabase Migrations (written, not yet applied)

| Migration | File | Status |
|---|---|---|
| Doctor break slots | `supabase/migrations/20260620000000_doctor_breaks.sql` | ⚠️ **Not applied** |
| book_appointment() function | `supabase/migrations/20260620000001_book_appointment_fn.sql` | ⚠️ **Not applied** |

---

## What Still Needs to Be Done

### Critical (app won't fully work without these)

- [ ] **Apply the two pending migrations** in Supabase SQL Editor:
  ```
  supabase/migrations/20260620000000_doctor_breaks.sql
  supabase/migrations/20260620000001_book_appointment_fn.sql
  ```

- [ ] **Enable Realtime** on `queue_entries` and `queues` tables in Supabase dashboard
  - Dashboard → Database → Replication → Tables → toggle both on
  - Run: `ALTER TABLE queue_entries REPLICA IDENTITY FULL;`

- [ ] **Seed doctor schedule data** — time slots are generated from `doctor_schedules`. Without seed data, the Doctor Schedule screen (`booking/[doctorId].tsx`) shows no slots.

### Nice to Have

- [ ] **Real ratings/geolocation** — Clinic cards show hardcoded `4.8★` and `1.2 km`. Add a `ratings` table or integrate Google Places.
- [ ] **Push notifications** — Firebase FCM token registration is scaffolded but the Edge Function (`supabase/functions/send-notification/`) wiring is not tested end-to-end.
- [ ] **Clinic photos** — No real photos in Supabase Storage. Currently using colored placeholder Views with initial letter.
- [ ] **Reschedule flow** — "Reschedule" button on appointments screen navigates to Home. Full rescheduling (pick new slot) is not implemented.
- [ ] **"Add to Calendar"** on booking confirmation — button is present but calendar API integration (`expo-calendar`) is not wired.
- [ ] **Doctor schedule generation** — The `generate-slots` Edge Function creates `time_slots` from `doctor_schedules`. It needs to be called periodically or on-demand.
- [ ] **Clinic web: Doctor CRUD** — Was in-progress in a background agent this session. Check `apps/clinic-web/src/app/(dashboard)/doctors/`.
- [ ] **Clinic web: Dashboard metrics** — Was in-progress in a background agent. Check `apps/clinic-web/src/app/(dashboard)/dashboard/`.
- [ ] **ShadCN component installation** — Was being set up by a background agent. Verify `components/ui/` is complete.

---

## Known Issues / Gotchas

### TypeScript Pre-existing Errors
These exist in files from before this session and are not caused by our changes:
- `otp.tsx` — dynamic import error (pre-existing)
- `supabase.ts` — `process` not found (pre-existing, from React 18/19 mismatch)
- Some `_layout.tsx` JSX errors from the same React type conflict

The root cause is pnpm hoisting `@types/react@19` from `clinic-web` into the mobile TypeScript context. `skipLibCheck: true` in `patient-mobile/tsconfig.json` prevents these from blocking builds.

### Never Use Ionicons Directly
The `Icon` wrapper in `src/components/Icon.tsx` exists solely because of the React 18/19 type mismatch. If anyone imports `Ionicons` directly in any `patient-mobile` file, TypeScript will error with `TS2786: 'Ionicons' cannot be used as a JSX component`.

### `clinics.phoneNumber` Not `clinics.phone`
The column is `phone_number` which maps to `phoneNumber` in camelCase. Using `clinic.phone` causes a TS error.

### Appointment Booking Uses a Stored Function
`book_appointment()` is a Postgres function (in the pending migration). Call it via:
```typescript
await supabase.rpc('book_appointment', { p_doctor_id, p_slot_id, p_notes })
```
Direct insert into `appointments` won't work correctly because the function atomically marks the time slot as BOOKED.

---

## How to Run

```bash
# Install dependencies
pnpm install

# Patient mobile app
cd apps/patient-mobile
pnpm start        # Expo dev server
# Then press 'i' for iOS simulator, 'a' for Android

# Clinic web app
cd apps/clinic-web
pnpm dev          # Next.js dev server on http://localhost:3000
```

### Environment Variables
Copy `.env.example` → `.env.local` in each app and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (web app only, for server actions)

---

## Background Agents Still Running (at time of handoff)

Two agents were launched for the clinic web app and may still be writing files:
- **UI foundation agent** — ShadCN components, nav update, `package.json`, migration
- **Dashboard + Doctor CRUD agent** — metrics page, full doctor management CRUD

Check `apps/clinic-web/src/` for their output after they complete.
