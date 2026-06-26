# CareFlow — Session Handoff

**Last updated:** 2026-06-26 (session 4)
**Branch:** `main`
**Repo:** https://github.com/xieshengqun-dave/careflow (private)

---

## Fix-Prompt Phase Status

Phases come from `CAREFLOW_FIX_PROMPT.md`. Work done in order — each phase committed separately.

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Tier-1 correctness bugs (cancel, queue race, check-in→queue, auth) | ✅ **Done** — commit `e837fb0` |
| **Phase 2** | Push notifications (device tokens, Edge Function, event triggers) | ✅ **Done** — commits `dc432be`, `4bd88ad` |
| **Phase 3** | Operational gaps (slot generation cron, wait estimates, skip recovery, audit log) | ✅ **Done** — commit `2f0b06e` |
| **Phase 4** | Polish / data quality (no-show rate fix, PENDING enum, migration dedup, doc fix) | ✅ **Done** — commit `9dc793f` |
| **Phase 5** | Multi-tenant platform (real OTP login, patients module, super_admin/platform console) | ❌ **Pending** |
| **Phase 6** | Design fidelity (token audit, screen-by-screen rebuild against design_handoff_careflow/) | 🔄 **In Progress** — patient-mobile done; clinic-web Appointments + Schedule + Group B screens done; Queue + Dashboard pending |

---

## Phase 1 — What Was Fixed (2026-06-24)

### 1.1 Cancel appointment now frees the time slot
- New migration: `supabase/migrations/20260624000000_cancel_appointment_fn.sql`
- `cancel_appointment(p_appointment_id)` runs atomically: verifies caller is the owning patient or active clinic staff, sets appointment to `CANCELLED`, flips the `time_slots` row back to `AVAILABLE`, removes any active queue entry for that appointment.
- `NO_SHOW` deliberately goes through a plain status update — slot stays `BOOKED` (the time has passed, no point reopening). Documented in `markNoShow()` and in the SQL function.
- Both mobile `cancelAppointment()` and web `cancelAppointmentStaff()` now call `supabase.rpc("cancel_appointment", ...)`.

### 1.2 Queue join race condition closed
- New migration: `supabase/migrations/20260624000001_join_queue_fn.sql`
- `join_queue(p_queue_id, p_type, p_priority, p_patient_id?)` locks the `queues` row, increments `current_number`, and inserts the entry — all in one transaction. Enforces "already in queue" guard inside the function.
- Mobile `joinQueue()` and web `addWalkIn()` both call `supabase.rpc("join_queue", ...)`.

### 1.3 Check-in now enters the queue
- New migration: `supabase/migrations/20260624000002_checkin_to_queue_fn.sql`
- `check_in_appointment(p_appointment_id)` atomically inserts a `queue_entries` row at `type='APPOINTMENT'`, `priority=2`, opens today's doctor queue if one isn't open yet, and is idempotent against double-clicks.
- Partial unique index `uq_queue_entries_active_appointment` backstops any race.
- Web `checkInAppointment()` calls `supabase.rpc("check_in_appointment", ...)`.

### 1.4 Auth fails closed
- `getServerUser()` in `apps/clinic-web/src/lib/auth.ts` returns `null` when there's no active `clinic_staff` row, instead of defaulting to `receptionist` with `clinicId: null`.
- Also fixed: `ADMIN` role now maps to `clinic_admin` via `STAFF_ROLE_MAP` (was incorrectly lowercased to `admin`).

---

## Phase 2 — What Was Built (2026-06-24)

### 2a — Push notification infrastructure
- New table: `device_tokens (user_id, token, platform, created_at)` with RLS — each user manages only their own rows. Migration: `20260624000003_device_tokens.sql`.
- New Edge Function: `supabase/functions/send-notification/index.ts` — looks up a user's device tokens, writes a row to `notifications`, and forwards to the Expo Push API.
- Patient app: `registerForPushNotificationsAsync()` in `apps/patient-mobile/src/lib/api/devices.ts` requests permission, gets an Expo push token, and upserts it into `device_tokens`. Called from `authStore.loadUser()` on login/token refresh (fire-and-forget).
- **Requires:** `eas init` to supply `extra.eas.projectId` in `app.json` — token registration no-ops with a clear error without it.

### 2b — Notification event wiring
- Migration `20260624000004_notification_dispatch.sql` adds:
  - `enqueue_notification()` helper — writes the `notifications` row and best-effort calls the Edge Function via `pg_net` (requires a one-time Vault secret `send_notification_url` — documented in the migration header).
  - DB triggers on: appointment confirmed, appointment cancelled, called to consultation, "you're next" when queue front changes.
  - `notify_queue_delayed()` — staff-initiated message to all waiting patients for a queue. Wired to a "Notify Everyone Waiting" button in the Queue Management UI.
  - `pg_cron` job (every 15 min) sends appointment reminders ~1 hr ahead, deduped via `appointments.reminder_sent_at` column. **Requires** `pg_cron` extension enabled in Supabase.
- Patient notifications screen now reads from the real `notifications` table instead of synthesizing from appointments/queue_entries. `is_read` is persisted back.

---

## Typecheck Fix (2026-06-26, commit `68fb143`)

Resolved pre-existing type errors that prevented `pnpm type-check` from passing. No runtime behavior changed:
- `@careflow/ui`: added missing `@careflow/shared` workspace dependency.
- `@careflow/database`: added `@types/node`, fixed stub supabase types (missing `Relationships: []`, missing tables, broken `Record<string,never>` for Views/Functions/Enums), fixed two query inserts with missing required fields.
- `@careflow/shared`: added `!` non-null assertions in slotEngine tests (array indexed access under `noUncheckedIndexedAccess`).
- `patient-mobile`: fixed Expo Router typed navigation — use `pathname: "/booking/[doctorId]"` + `params` instead of template-literal paths; fixed tab `_layout.tsx` `onPress` cast; fixed `/(tabs)/index` → `/`.

---

## Pending Phases — What Each Requires

### Phase 3 — Operational gaps

**3.1 Scheduled slot generation**
Generate `time_slots` from `doctor_schedules` on a rolling window automatically. Currently the `generate-slots` Edge Function exists but must be called manually.
- Add a `pg_cron` schedule (or trigger) that calls it daily for the next N days, idempotently.

**3.2 Honest wait estimates**
`estimateWaitMinutes` in `packages/shared/src/utils/date.ts` is `peopleAhead × consultationDuration`. Improve to use the doctor's actual median consultation time today (from `completed_at - called_at`) and to account for a paused queue.

**3.3 Skip recovery**
`skipEntry()` just sets `status = 'SKIPPED'` with no path back. Add a "requeue" action that moves the patient to the back of the queue (new `queue_number`), and expose it in the receptionist UI.

**3.4 Audit log**
Add an `activity_log` table. Write a row for every sensitive action: check-in, cancel, no-show, skip, emergency override, remove. UI is not needed yet — just capture it.

---

### Phase 4 — Polish / data quality

**4.1 No-show rate denominator**
`noShowRate` in `apps/clinic-web/src/lib/queries/dashboard.ts` divides by all today's appointments including future ones, understating the rate all day. Denominator should only include appointments whose slot time has already passed.

**4.2 PENDING enum value**
`appointment_status` includes `PENDING` but bookings are created `CONFIRMED` and nothing produces `PENDING`. Either remove it from the enum (risky if clients reference it) or add a code comment explaining it's reserved.

**4.3 Clean `supabase db reset`**
Two migrations (`20260618000000_initial_schema.sql` and `20260618000002_complete_schema.sql`) both attempt to create some of the same types/tables. A clean reset currently errors on "type already exists". Need to consolidate without breaking existing applied-migration history.

**4.4 HANDOFF doc — `book_appointment` snippet**
The usage snippet at the bottom of this file (and previously in HANDOFF.md) showed the old `{ p_doctor_id, p_slot_id, p_notes }` signature. The real signature is `{ p_patient_id, p_doctor_id, p_clinic_id, p_slot_date, p_start_time, p_end_time, p_notes }` — matching what the mobile app actually calls.

---

### Phase 5 — Multi-tenant platform features (large)

**5.1 Real patient OTP login** *(launch-blocking)*
`(auth)/login.tsx` is a dev stub — calls `signInWithPassword` with a hardcoded email. `authStore.ts` fabricates a "Test Patient" profile with a fake phone number.
- Wire: phone entry → `sendOTP` → `otp.tsx` verify → onboarding if new user → app.
- Remove the "Test Patient" fallback entirely.
- Depends on Supabase phone/SMS provider being configured (e.g. Twilio).

**5.2 Clinic context + patients module**
- Show the actual clinic name in the dashboard sidebar/header (currently shows "Clinic Portal").
- Fix a PII leak: current `profiles` RLS lets any staff at any clinic read every patient on the platform. Tighten so staff only see patients with a relationship to their clinic.
- Add a `/patients` page for searching, viewing, and creating patients (reusing `addWalkIn`'s find-or-create logic as a first-class feature).

**5.3 Platform admin (super_admin)**
Currently `super_admin` is type-only and non-functional — no `platform_admins` table, no cross-tenant RLS, no UI.
- Create `platform_admins` table + `auth.is_platform_admin()` helper.
- Add read-only platform-admin RLS policies on all tenant tables.
- Update `getServerUser()` to detect platform admins and return `role: "super_admin"` with `clinicId: null`.
- Add a `(platform)` route group in `clinic-web` hard-gated by `is_platform_admin()`, with pages: All Clinics, All Doctors, All Patients, Platform Overview, Onboard Clinic.
- Clinic provisioning flow: create clinic + first clinic_admin from the platform console.
- Every cross-tenant PII access must write to the audit log (Phase 3.4).

---

### Phase 6 — Design fidelity (audit-before-fix per screen)

`design_handoff_careflow/` is the single authoritative UI source. Process for each screen:
1. Read that screen's section in `design_handoff_careflow/README.md` + the matching `*.standalone.html`.
2. List every discrepancy (layout, spacing, colors, typography, states).
3. Get go-ahead, then fix using tokens — never hardcoded values.
4. `pnpm type-check`, then commit per screen.

**6.0 Token-compliance audit (do first)**
Confirm `careflow-tokens.ts` in both apps matches the design package (platform navy/indigo tokens were added). Scan for hardcoded colors/spacing/radii across both apps.

**Group A — Existing screens to fix:**

| Screen | File(s) |
|---|---|
| Patient — Home ⚠️ | `apps/patient-mobile/src/app/(tabs)/index.tsx` | ✅ Done (commit `7f0c6e7`) |
| Appointments (web) ⚠️ | `apps/clinic-web/src/app/(dashboard)/appointments/page.tsx` + `AppointmentList.tsx` | ✅ Done (session 3, uncommitted) |
| Schedule (web) ⚠️ | `apps/clinic-web/src/app/(dashboard)/schedules/page.tsx` + `components/schedules/*` | ✅ Done (session 3, uncommitted) |
| Queue Management (web) ⚠️ | `apps/clinic-web/src/app/(dashboard)/queue/page.tsx` + `QueueManagementView.tsx` | ✅ Done (rebuilt in Phase 3 commit `2f0b06e`) |
| Clinic Dashboard (web) | `apps/clinic-web/src/app/(dashboard)/dashboard/page.tsx` + `components/dashboard/*` | ✅ Done (rebuilt in earlier session) |
| Patient — Splash/Login/OTP | `(auth)/login.tsx`, `(auth)/otp.tsx` |
| Patient — Find Clinics | `apps/patient-mobile/src/app/clinic/search.tsx` |
| Patient — Clinic Details | `apps/patient-mobile/src/app/clinic/[clinicId].tsx` |
| Patient — Doctor Schedule/Booking | `apps/patient-mobile/src/app/booking/[doctorId].tsx` |
| Patient — Booking Confirmation | `apps/patient-mobile/src/app/booking/confirm.tsx` |
| Patient — My Appointments | `apps/patient-mobile/src/app/(tabs)/appointments.tsx` |
| Patient — Join Queue | `apps/patient-mobile/src/app/queue/join.tsx` |
| Patient — Queue Tracking | `apps/patient-mobile/src/app/queue/[queueId].tsx` |
| Patient — Notifications | `apps/patient-mobile/src/app/(tabs)/notifications.tsx` |

**Group B — New screens to build from spec:**

| Screen | Build location | Backend dep | Status |
|---|---|---|---|
| Patient — Onboarding / name capture | `apps/patient-mobile/src/app/onboarding/index.tsx` | Phase 5.1 | ❌ Pending |
| Patient — Check-In (QR / confirm) | `apps/patient-mobile/src/app/(tabs)/checkin.tsx` | Phase 1.3 ✅ | ✅ Done (session 4) |
| Patient — Reschedule | new `apps/patient-mobile/src/app/booking/reschedule.tsx` | reschedule logic (not built) | ❌ Pending |
| Patient — UI states (skeleton/empty/error) | reusable components | — | ✅ Done (session 4) |
| Clinic staff Login (web) | `apps/clinic-web/src/app/(auth)/login/page.tsx` | Phase 1.4 ✅ | ✅ Done (existed) |
| Clinic Forgot/Reset password (web) | `(auth)/forgot-password`, `reset-password` | Supabase auth | ✅ Done (session 4, logo polish) |
| New Appointment dialog (staff) | `components/scheduling/NewAppointmentDialog.tsx` | `staff_book_appointment` fn | ✅ Done (session 4) |
| Add Patient dialog (staff) | modal, reused by New Appointment | Phase 5.2 | ❌ Pending |
| Table loading/empty states | Appointments + Queue tables | — | ✅ Done (session 4) |
| Platform Console — Login | new `(platform)` route group | Phase 5.3 | ❌ Pending |
| Platform Console — Shell/nav | `(platform)` layout | Phase 5.3 | ❌ Pending |
| Platform — Overview | `(platform)/overview` | Phase 5.3 | ❌ Pending |
| Platform — Clinics + detail | `(platform)/clinics` | Phase 5.3 | ❌ Pending |
| Platform — Doctors | `(platform)/doctors` | Phase 5.3 | ❌ Pending |
| Platform — Patients | `(platform)/patients` | Phase 5.3 | ❌ Pending |
| Platform — Onboard Clinic | `(platform)/onboard` | Phase 5.3 | ❌ Pending |

---

## Session 4 — What Was Built (2026-06-26)

### Group B screens — first batch

**Patient — Check-In screen** (`apps/patient-mobile/src/app/(tabs)/checkin.tsx`)
- Replaced placeholder (scan icon + static buttons) with a live screen that fetches today's appointments for the logged-in patient.
- Each appointment card shows doctor avatar, status pill (Confirmed / Checked In), and appointment time.
- **Pre-check-in state**: displays a 6-char appointment code (last 6 hex chars of UUID) to show at the reception desk. Staff enter it on the web app to trigger `check_in_appointment()`.
- **Checked-in state**: shows "You're in the queue" badge + "Track Queue" button that navigates to `/queue/[entryId]`.
- Empty state: two buttons (View All Appointments, Find Clinic) + walk-in hint.
- Walk-in card at the bottom for patients with appointments who also want to join another queue.

**New Appointment dialog** (staff web — `apps/clinic-web/src/components/scheduling/NewAppointmentDialog.tsx`)
- 4-step wizard: Find Patient → Select Doctor → Pick Time Slot → Confirm + Notes.
- Step 1: phone number lookup via `lookupPatientByPhone()` server action; shows error if patient hasn't registered in the app.
- Step 2: doctor list loaded from `fetchClinicDoctors()` server action.
- Step 3: date picker + available slot grid loaded via `fetchSlotsForDialog()` (uses existing `getDoctorSlotsForDate` query); date change re-fetches slots.
- Step 4: summary card + optional notes textarea; submit calls `createStaffAppointment()`.
- Success state: green checkmark screen, closes dialog and revalidates `/appointments`.
- Wired into the "New Appointment" button in `appointments/page.tsx` (replaced the static `<Button>`).

**New migration**: `supabase/migrations/20260626000001_staff_book_appointment_fn.sql`
- `staff_book_appointment()` function — same atomic slot-claim logic as `book_appointment()` but auth check verifies clinic staff instead of requiring caller == patient.
- **Must be applied manually** in Supabase SQL Editor.

**New server actions** added to `apps/clinic-web/src/lib/actions/appointments.ts`:
- `createStaffAppointment(params)` — looks up patient by phone, calls `staff_book_appointment` RPC
- `lookupPatientByPhone(phone)` — returns `{ id, fullName }` or null
- `fetchSlotsForDialog(clinicId, doctorId, date)` — wraps `getDoctorSlotsForDate` for client use
- `fetchClinicDoctors(clinicId)` — returns list of `{ id, name, specialization }` for active clinic staff

**Auth pages logo polish** (clinic-web)
- `forgot-password/page.tsx` and `reset-password/page.tsx`: replaced plain text `<h1>CareFlow</h1>` with `<Image src="/logo.png">` to match login page.

**Patient-mobile UI states**
- `apps/patient-mobile/src/components/ui/Skeleton.tsx` — `Skeleton` base (pulse animation via `Animated`), `SkeletonAppointmentCard`, `SkeletonClinicCard`, `SkeletonHeroCard` presets.
- Home screen (`(tabs)/index.tsx`) — added `loading` state; clinics section shows 3 `SkeletonClinicCard` placeholders while data loads, then falls back to "No clinics found nearby" when empty.

**Clinic-web loading states**
- `(dashboard)/queue/loading.tsx` — stat card + queue board skeleton (previously missing).
- `(dashboard)/dashboard/loading.tsx` — metric card row + chart area skeleton (previously missing).
- `(dashboard)/appointments/loading.tsx` — updated to match actual page layout (header + DateNav + table rows).

---

## Session 3 — What Was Fixed / Built (2026-06-26)

### Patient-mobile crash fixes
- **`metro.config.js`** — replaced `extraNodeModules` (loses to pnpm virtual-store symlinks) with `resolveRequest` that intercepts all `react` / `react/*` imports before the node_modules walk, forcing one React instance regardless of which symlink path a transitive dep follows.
- **`babel.config.js`** — removed `"react-native-reanimated/plugin"` (package not installed, would fail on `--clear`; all animation in the app uses RN core `Animated`, not reanimated).
- **`_layout.tsx`** — added `SafeAreaProvider` wrapper (was missing; required by all screens that use `SafeAreaView` from `react-native-safe-area-context`). Removed invalid `Stack.Screen name="(auth)"` and `name="onboarding"` entries (not valid route names in Expo Router v6; were generating repeated warnings and unnecessary re-renders).
- **`authStore.ts`** — wrapped `loadUser()` in try/catch; on any error sets `isLoading: false` so the splash screen never hangs forever (previously a network error or missing env vars would leave `isLoading: true` indefinitely).
- **`devices.ts`** — wrapped all post-import notification API calls in try/catch; Expo Go throws on `getPermissionsAsync()` even though the module itself loads cleanly.

### Phase 6 clinic-web design fidelity
- **Appointments page** — removed duplicate server-side search form; added `DateNav` week-picker for list view; added List/Slots toggle pill; renamed button to "New Appointment"; appointment count shown next to date nav.
- **AppointmentList** — search input now has icon; `initialSearch` prop removed (filter bar is fully client-side); table header, status badges, avatar styling from in-progress staged changes kept.
- **ScheduleGrid** — rebuilt from vertical day-list to **7-column horizontal week grid** (Mon→Sun). Columns tinted blue if day has blocks. Time blocks are compact pills with left accent bar showing start/end time stacked, hover reveals inline edit/delete. Add button at bottom of each column as dashed row.

---

## Still Open / Known Issues

- **expo-notifications crash in Expo Go (SDK 53+)** — Fixed in session 2 & 3: lazy import + full try/catch around API calls. Works in a dev build with EAS.
- **Fake "Live Queue Updates" data** in `queue/[queueId].tsx` — hardcoded scripted feed + hardcoded timestamps. Explicitly out of scope for now (Phase 2 handles real push; the fake feed is a separate cleanup).
- **Realtime needs manual setup** in Supabase dashboard: Database → Replication → toggle on `queue_entries` + `queues`, then run `ALTER TABLE queue_entries REPLICA IDENTITY FULL;`.
- **Three pending migrations not yet applied**:
  - `supabase/migrations/20260620000000_doctor_breaks.sql` — doctor break slots
  - `supabase/migrations/20260620000001_book_appointment_fn.sql` — `book_appointment()` patient function
  - `supabase/migrations/20260626000001_staff_book_appointment_fn.sql` — `staff_book_appointment()` for New Appointment dialog
- **Phase 2 push requires one-time setup:**
  - Supabase Vault secret `send_notification_url` pointing to the Edge Function URL.
  - `pg_cron` extension enabled for the reminder job.
  - `eas init` in `apps/patient-mobile/` to get an EAS project ID for Expo push.
- **Ratings / geolocation** are not in the DB — clinic cards show hardcoded `4.8★` and distances.
- **Clinic photos** — no real photos in Supabase Storage; using colored placeholder initials.
- **"Add to Calendar"** on booking confirmation — button present but `expo-calendar` not wired.
- **Doctor schedule seed data** — `booking/[doctorId].tsx` shows no slots without entries in `doctor_schedules`.
- **Staff seed accounts have empty passwords** — set a real password in Supabase Dashboard → Authentication → Users → Reset Password before testing clinic-web login.

---

## Architecture Reminders

### Appointment booking (correct call)
```typescript
await supabase.rpc("book_appointment", {
  p_patient_id: patientId,
  p_doctor_id:  doctorId,
  p_clinic_id:  clinicId,
  p_slot_date:  "YYYY-MM-DD",
  p_start_time: "HH:MM:00",
  p_end_time:   "HH:MM:00",
  p_notes:      null,
});
```

### Queue join (correct call)
```typescript
await supabase.rpc("join_queue", {
  p_queue_id:   queueId,
  p_type:       "WALK_IN",
  p_priority:   3,
  // p_patient_id omitted for patient self-join — function uses auth.uid()
});
```

### Check-in (correct call)
```typescript
await supabase.rpc("check_in_appointment", { p_appointment_id: appointmentId });
// Returns the queue_entry id
```

### Cancel (correct call)
```typescript
await supabase.rpc("cancel_appointment", { p_appointment_id: appointmentId });
// Frees the time_slot and removes any active queue entry
```

### Staff book appointment (correct call)
```typescript
await supabase.rpc("staff_book_appointment", {
  p_patient_id: patientId,
  p_doctor_id:  doctorId,
  p_clinic_id:  clinicId,
  p_slot_date:  "YYYY-MM-DD",
  p_start_time: "HH:MM:00",
  p_end_time:   "HH:MM:00",
  p_notes:      null,
});
// Returns appointment ID. Auth check: caller must be active clinic_staff of this clinic.
// Different from book_appointment() which checks caller == patient.
```

### Never do
- Import `Ionicons` directly in patient-mobile — use `Icon` from `@/components/Icon`
- Import `SafeAreaView` from `"react-native"` — use `react-native-safe-area-context`
- Select `consultation_fee` anywhere — column doesn't exist, Postgrest silently drops the whole query
- Use template-literal pathnames in `router.push` — use `pathname: "/route/[param]"` + `params: {}`

---

## How to Run

```bash
pnpm install

# Patient mobile
cd apps/patient-mobile && pnpm start   # press i/a for simulator

# Clinic web
cd apps/clinic-web && pnpm dev         # http://localhost:3000
```

### Environment Variables
Copy `.env.example` → `.env.local` in each app:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (clinic-web server actions only)
