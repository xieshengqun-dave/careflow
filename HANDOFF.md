# CareFlow — Session Handoff

**Last updated:** 2026-09-02 (Session 10 — chair management committed; Phase 5.2 complete: profiles RLS PII-leak fix + `/patients` page)
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
| **Phase 5** | Multi-tenant platform (real OTP login, patients module, super_admin/platform console) | 🔄 **In Progress** — 5.3 (platform console) done; 5.2 (RLS fix + `/patients` page) done (session 10); 5.1 (OTP login) pending |
| **Phase 6** | Design fidelity (token audit, screen-by-screen rebuild against design_handoff_careflow/) | 🔄 **In Progress** — patient-mobile done; clinic-web Appointments + Schedule + Queue done; Dashboard pending further polish |

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
| Queue Management (web) | `apps/clinic-web/src/app/(dashboard)/queue/page.tsx` + `QueueManagementView.tsx` | ✅ Done (Phase 3 + Phase 6 polish session 4) |
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
| Patient — Reschedule | new `apps/patient-mobile/src/app/booking/reschedule.tsx` | `reschedule_appointment` fn | ✅ Done (session 4) |
| Patient — UI states (skeleton/empty/error) | reusable components | — | ✅ Done (session 4) |
| Clinic staff Login (web) | `apps/clinic-web/src/app/(auth)/login/page.tsx` | Phase 1.4 ✅ | ✅ Done (existed) |
| Clinic Forgot/Reset password (web) | `(auth)/forgot-password`, `reset-password` | Supabase auth | ✅ Done (session 4, logo polish) |
| New Appointment dialog (staff) | `components/scheduling/NewAppointmentDialog.tsx` | `staff_book_appointment` fn | ✅ Done (session 4) |
| Add Patient dialog (staff) | modal, reused by New Appointment | Phase 5.2 | ✅ Done (session 10) |
| Table loading/empty states | Appointments + Queue tables | — | ✅ Done (session 4) |
| Platform Console — Login | new `(platform)` route group | Phase 5.3 | ❌ Pending |
| Platform Console — Shell/nav | `(platform)` layout | Phase 5.3 | ❌ Pending |
| Platform — Overview | `(platform)/overview` | Phase 5.3 | ❌ Pending |
| Platform — Clinics + detail | `(platform)/clinics` | Phase 5.3 | ❌ Pending |
| Platform — Doctors | `(platform)/doctors` | Phase 5.3 | ❌ Pending |
| Platform — Patients | `(platform)/patients` | Phase 5.3 | ❌ Pending |
| Platform — Onboard Clinic | `(platform)/onboard` | Phase 5.3 | ❌ Pending |

---

## Session 7 — Platform Console Staff Fix (2026-06-30)

### Root Cause Analysis

Three compounding bugs caused the staff management page to show wrong data for all clinics:

**Bug 1 — RLS blocked `createServerClient()` for platform admin**
`getClinicStaff()` used `createServerClient()` which respects Supabase RLS. Platform admins (`admin@careflow.asia`) have no `clinic_id` in their JWT `app_metadata`, so the RLS policy on `clinic_staff` silently returned empty rows — no error thrown, just zero results.

**Bug 2 — `user.clinicId ?? scopeClinicId` wrong operand order**
If the platform admin also exists in `clinic_staff` (e.g., with `role = SUPER_ADMIN` from a test row), `getServerUser()` falls through to the `clinic_staff` branch if the `platform_admins` query returns null. This yields `user.clinicId = (that staff row's clinic_id)` — a non-null value. `user.clinicId ?? scopeClinicId` then ignores the URL param entirely and scopes all queries to that one wrong clinic, making every Manage Staff page show the same staff.

**Bug 3 — SUPER_ADMIN rows leaking into staff list**
`clinic_staff` rows with `role = SUPER_ADMIN` were included in results because there was no role filter. Platform admin appeared as "Admin User / Super Admin" on every clinic's staff page.

### What Was Fixed

**`apps/clinic-web/src/lib/actions/settings.ts`**
- `getClinicStaff`: switched to `createAdminClient()` to bypass RLS
- `getClinicStaff`: changed `user.clinicId ?? scopeClinicId` → `scopeClinicId ?? user.clinicId` so URL param always wins
- `getClinicStaff`: added `if (!targetClinicId) return []` early exit + moved `.eq("clinic_id", targetClinicId)` to first filter (unconditional)
- `getClinicStaff`: added `.in("role", ["DOCTOR", "RECEPTIONIST", "CLINIC_ADMIN"])` to exclude SUPER_ADMIN rows
- `getClinicStaff`: now fetches auth email per staff member via `auth.admin.getUserById()`; falls back to email then userId if `full_name` is null
- `setStaffRole`: switched to `createAdminClient()` + proper conditional query reassignment

**`apps/clinic-web/src/components/settings/StaffPasswordManager.tsx`**
- Added `email` field to `StaffMember` interface; shows email under each staff row for identity confirmation

**`apps/clinic-web/src/app/(platform)/platform/clinics/[clinicId]/page.tsx`**
- Added `export const dynamic = "force-dynamic"` to prevent caching
- Shows account count + last-8-chars clinic ID in subtitle for debugging

### Key Lesson
When a Supabase filter appears to have no effect, the cause is almost always one of: (1) RLS blocking the query silently (empty result, no error), (2) wrong `??` operand order causing the explicit scope to be ignored, (3) wrong client type (`createServerClient` vs `createAdminClient`). Add `console.log(targetClinicId, data?.length, error)` *first* before changing filter logic.

---

## Session 6 — Smart Queue Foundation (2026-06-29)

### What Was Built

**Goal:** Give every queue entry tracked estimated duration, actual duration, arrival status, and wait time. Design the architecture so future AI optimisation can plug in without refactoring the caller layer.

### Architecture

```
DB layer:    queue_entries + doctor_treatment_stats  (schema additions + RPC)
Shared pkg:  packages/shared/src/utils/queueEngine.ts  (pure functions)
Query layer: lib/queries/queue.ts                   (compute estimates server-side)
Action layer: lib/actions/queue.ts + appointments.ts  (enrich entries at key events)
UI layer:    DoctorQueueColumns.tsx                 (display wait time + arrival badge)
```

The engine (`queueEngine.ts`) is a pure-function module — no DB access, no side effects, fully testable. The AI hook is `rankQueueEntries()`: currently rule-based (priority → FIFO), but its signature is stable so callers never change when an ML model is wired in.

### New Migration — `20260629000003_smart_queue_foundation.sql`
**Run this in Supabase SQL Editor.**

- `queue_entries`: adds `estimated_duration_minutes`, `actual_duration_minutes`, `scheduled_start_time`, `arrival_status` (EARLY/ON_TIME/LATE/NO_SHOW)
- `appointments`: adds `estimated_duration_minutes`
- New table `doctor_treatment_stats(doctor_id, treatment_type, sample_count, total_duration_minutes, avg_duration_minutes [generated], min/max, updated_at)` — accumulates real data each time a consultation completes
- New RPC `record_consultation_complete(p_entry_id)` — atomically marks COMPLETED, sets `actual_duration_minutes`, upserts into `doctor_treatment_stats`

### New Shared Package — `queueEngine.ts`
Exported via `@careflow/shared`:

| Export | Purpose |
|---|---|
| `DEFAULT_TREATMENT_DURATIONS` | Global default durations by treatment type |
| `FALLBACK_DURATION_MINUTES` (30) | When no type or history exists |
| `DoctorDurationProfile` | `{ defaultMinutes, byTreatmentType }` |
| `QueueEntryInput` | Minimal entry shape for engine input |
| `QueuePositionEstimate` | `{ entryId, positionFromNow, estimatedStartTime, estimatedEndTime, estimatedWaitMinutes }` |
| `rankQueueEntries()` | **AI hook** — currently priority→FIFO |
| `getEstimatedDuration()` | Doctor profile → treatment type → global default → fallback |
| `classifyArrival()` | Returns EARLY/ON_TIME/LATE based on scheduled vs actual arrival |
| `computeActualDuration()` | called_at → completed_at in minutes |
| `computeQueueEstimates()` | Produces `QueuePositionEstimate[]` for all WAITING entries |

### Changes to Existing Files

**`lib/queries/queue.ts`**
- `QueueEntryData`: added `estimatedDurationMinutes`, `actualDurationMinutes`, `scheduledStartTime`, `arrivalStatus`, `estimatedWaitMinutes`
- `getTodayQueueData`: selects the 4 new columns; fetches `doctor_treatment_stats`; calls `computeQueueEstimates` per doctor queue; populates `estimatedWaitMinutes` on each WAITING entry

**`lib/actions/queue.ts`**
- `completeConsultation`: now calls `record_consultation_complete` RPC (records duration + updates stats); falls back to direct update if migration hasn't been applied
- `addWalkIn`: captures the entry `id` returned by `join_queue` RPC; sets `estimated_duration_minutes` based on treatment type
- `quickCheckInByCode`: captures entry `id` returned by `check_in_appointment` RPC; calls `enrichCheckInEntry` to set `scheduled_start_time`, `arrival_status`, `estimated_duration_minutes`
- New private helper `enrichCheckInEntry(supabase, entryId, appt)` — shared by both code and phone check-in paths

**`lib/actions/appointments.ts`**
- `checkInAppointment`: same enrichment via `classifyArrival` + `getEstimatedDuration`; best-effort (silently ignored if migration pending)

**`components/queue/DoctorQueueColumns.tsx`**
- WAITING entries: shows `~Xm` estimated wait (amber if >30 min)
- IN_CONSULTATION entries: shows elapsed time since called_at
- APPOINTMENT entries: shows LATE/EARLY arrival badge (ON_TIME hidden to reduce noise)

### Graceful Degradation
All enrichment updates use `as never` type cast and don't check errors — they fail silently if migration 20260629000003 hasn't been applied. Core check-in/complete functionality still works without the migration.

---

## Session 5 — Receptionist Workflow Redesign (2026-06-29)

### What Was Built

**Phase: Dental Clinic Workflow Redesign** — full redesign of the reception experience based on a workflow analysis for a 3-dentist, 5-chair Malaysian dental clinic.

**Key success criteria met:**
| Workflow | Before | After |
|---|---|---|
| Check-in | ~25 seconds (navigate + search) | ~7 seconds (type code + Enter) |
| Walk-in | ~55 seconds (7 steps, phone required) | ~20 seconds (name only, optional phone) |
| Emergency | ~75 seconds (9 steps) | ~8 seconds (Emergency button) |
| Reschedule | Not possible (cancel + rebook) | ~15 seconds (new Reschedule button) |
| Queue visibility | Requires navigation | Always on screen |
| Change dentist | ~90 seconds | 3 clicks (Reassign dropdown) |

**New: Quick Check-in Bar** (`components/queue/QuickCheckIn.tsx`)
- Persistent input at top of Queue Management page — type appointment code (6-char hex) or phone number
- Auto-detects code vs phone; searches today's CONFIRMED appointments client-side
- The 6-char code on the patient app NOW WORKS for the first time — closes the biggest UX gap
- Toast confirms: "Ali Hassan — checked in"

**New: Emergency Button** (`components/queue/EmergencyButton.tsx`)
- Red button in the top action bar
- Minimal overlay: name only required (no phone)
- Creates a guest profile automatically
- Priority 1 auto-places at front of queue — no "Move to Top" step needed
- Doctor selector shows live queue depths

**New: Per-Doctor Queue Columns** (`components/queue/DoctorQueueColumns.tsx`)
- Replaces the combined mixed-doctor list
- One card column per doctor, side by side
- Each column: doctor name, status badge, waiting count, per-column Call Next button
- IN_CONSULTATION / CALLED entries highlighted in green/blue
- Emergency patients shown with red "!" badge
- Treatment type shown inline
- Click any patient to open detail panel

**Redesigned: Queue Management View** (`components/queue/QueueManagementView.tsx`)
- New layout: Quick Check-in bar → stats → Doctor Columns + detail panel
- Detail panel now includes:
  - Separate "Call" (specific patient) vs column-level "Call Next"
  - "Complete Consultation" button when patient is in chair
  - "Reassign to doctor" dropdown — moves patient to another doctor's queue in 3 clicks
  - All existing actions (pause, delay notify, skip, remove, requeue)

**Walk-in improvements** (`components/queue/AddWalkInDialog.tsx`)
- Phone number now **optional** — no longer blocks walk-ins without phones
- Doctor selector shows live queue depths: "Dr. Ahmad (3 waiting)"
- Treatment type quick-select: Checkup / Cleaning / Filling / Extraction / Root Canal / Crown / Other

**New: Reschedule Button** (`components/scheduling/AppointmentList.tsx` + `RescheduleDialog.tsx`)
- "Reschedule" button on every CONFIRMED/PENDING appointment row
- Shows current appointment summary, date picker, available slots for same doctor
- Atomically frees old slot + books new slot (direct DB update, same as patient-side reschedule)
- Success state with confirmation

**Overdue appointment highlighting** (`AppointmentList.tsx`)
- CONFIRMED appointments 15+ minutes past their slot time get amber background + alert icon
- "X Overdue — Mark No Show" sweep button appears in the filter bar when overdue exist
- Single click marks all overdue as NO_SHOW

**Bug fixes included:**
- `profiles.phone` → `profiles.phone_number` in `queries/appointments.ts` (fixes silent empty appointment list bug)
- Same fix in `actions/appointments.ts` (`lookupPatientByPhone` and `createStaffAppointment`)
- `.single()` → `.maybeSingle()` in `lookupPatientByPhone` and `createStaffAppointment`

**New server actions:**
- `quickCheckInByCode(code)` — check in by appointment code or phone
- `addEmergency({ name, queueId })` — priority-1 guest walk-in
- `reassignEntry(entryId, targetQueueId)` — move patient between doctor queues
- `rescheduleAppointment(appointmentId, newDate, newStartTime)` — atomic reschedule

**New migration:**
- `supabase/migrations/20260629000002_treatment_type.sql` — adds `treatment_type TEXT` column to `appointments` and `queue_entries`. Run in Supabase SQL Editor before using treatment type.

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

**Patient — Reschedule screen** (`apps/patient-mobile/src/app/booking/reschedule.tsx`)
- New screen; takes `appointmentId`, `doctorId`, `doctorName`, `currentDate`, `currentTime` params.
- Shows current appointment summary, then a date picker (starts from tomorrow) + time slot grid for the same doctor.
- On confirm: calls `rescheduleAppointment()` → `reschedule_appointment()` RPC (atomically frees old slot + claims new one).
- On success: Alert with new time, then replaces navigation to appointments list.
- `appointments.tsx`: updated `handleReschedule` to navigate with full appointment context; `FullAppointment` now includes `doctorId`; query now selects `doctors.id`.
- New migration: `supabase/migrations/20260626000002_reschedule_appointment_fn.sql` — **must be applied manually**.
- New API: `rescheduleAppointment()` in `apps/patient-mobile/src/lib/api/appointments.ts`.

**Patient-mobile UI states**
- `apps/patient-mobile/src/components/ui/Skeleton.tsx` — `Skeleton` base (pulse animation via `Animated`), `SkeletonAppointmentCard`, `SkeletonClinicCard`, `SkeletonHeroCard` presets.
- Home screen (`(tabs)/index.tsx`) — added `loading` state; clinics section shows 3 `SkeletonClinicCard` placeholders while data loads, then falls back to "No clinics found nearby" when empty.

**Queue Management design polish** (clinic-web)
- `QueueManagementView.tsx`: stat cards rebuilt with icon + colored bg, `rounded-[18px]` card border, value + unit layout.
- Queue table: `rounded-[18px]` wrapper, `bg-[#F8FAFC]` header row, uppercase tracking-wide headers, `rounded-md` status pills (was `rounded-full`), font-semibold patient name.
- Detail panel: converted from Card component to styled div with header bar + empty state icon.
- Removed unused Card/CardContent/CardHeader/CardTitle imports.

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
- **All migrations applied** (as of 2026-06-29):
  - `supabase/migrations/20260620000000_doctor_breaks.sql` ✅
  - `supabase/migrations/20260620000001_book_appointment_fn.sql` ✅
  - `supabase/migrations/20260626000001_staff_book_appointment_fn.sql` ✅
  - `supabase/migrations/20260626000002_reschedule_appointment_fn.sql` ✅
  - `supabase/migrations/20260629000000_extend_staff_role_enum.sql` ✅ (adds CLINIC_ADMIN + SUPER_ADMIN to staff_role enum)
  - `supabase/migrations/20260629000001_platform_admins.sql` ✅
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

## Session 8 — Receptionist-First UX (2026-07-01)

### What Was Changed

**Goal:** Queue Board becomes the landing page. Dashboard becomes owner-only. Navigation is simplified by role. Every common receptionist task is reachable in ≤ 3 clicks.

### Files Changed

**`apps/clinic-web/src/middleware.ts`**
- Post-login redirect changed from `/dashboard` → `/queue`
- Platform admin redirect (→ `/platform/overview`) unchanged
- Effect: every staff member who logs in lands on the Queue Board — the screen they use all day

**`apps/clinic-web/src/components/shared/SidebarNav.tsx`**
- Now accepts `userRole: UserRole` prop (passed from layout)
- Nav items are role-scoped:
  - **Receptionist**: Queue, Appointments (2 items — nothing irrelevant)
  - **Doctor**: Queue, Appointments, My Schedule (3 items)
  - **Clinic Admin**: Queue, Appointments + Management section (Dashboard, Doctors, Schedules, Settings)
- Queue is always first
- Admins see a "Management" section label separating daily-ops from configuration items
- Extracted `NavLink` sub-component to eliminate the inline repetition

**`apps/clinic-web/src/app/(dashboard)/layout.tsx`**
- Passes `user.role` to `<SidebarNav userRole={user.role} />`
- Removed the "CareFlow App" promo card (promotes the patient mobile app which is frozen per Phase 1 roadmap)
- Sidebar subtitle is now role-specific: "Reception" / "Doctor Portal" / "Admin Portal" (instead of "Clinic Portal" for everyone)
- Removed unused `Smartphone` import

**`apps/clinic-web/src/app/(dashboard)/dashboard/page.tsx`**
- Receptionist and Doctor roles are redirected to `/queue` if they land on `/dashboard`
- Clinic Admins and Super Admins continue to see the Dashboard
- Note: ROUTE_PERMISSIONS intentionally left unchanged — middleware still allows the route; the page redirects gracefully to `/queue` rather than the harsh `/unauthorized` page

### Before vs After

| Metric | Before | After |
|---|---|---|
| Landing page after login | Dashboard (metrics) | Queue Board (live queue) |
| Nav items for receptionist | 6 (all roles same) | 2 (Queue, Appointments) |
| Nav items for doctor | 6 | 3 (Queue, Appointments, My Schedule) |
| Nav items for clinic admin | 6 | 6 (same, now grouped) |
| Dashboard access | All roles | Clinic Admin + Super Admin only |
| Sidebar subtitle | "Clinic Portal" always | Role-specific label |
| Promo card | Shown to everyone | Removed |
| Clicks to reach Queue (receptionist) | 2 (login → Dashboard → Queue nav) | 0 (login lands on Queue) |

### Workflow Improvements

| Task | Before | After |
|---|---|---|
| Start the workday | Login → see metrics → click Queue | Login → Queue Board immediately |
| Check-in a patient | Navigate to Queue + type code | Already on Queue, type code (1 action) |
| Add walk-in | Navigate to Queue + click Walk-in | Already on Queue, click Walk-in (1 click) |
| Add emergency | Navigate to Queue + Emergency button | Already on Queue, Emergency button (1 click) |
| Receptionist sees Dashboard | Visible (confusing) | Redirected to Queue |
| Receptionist nav cognitive load | 6 items, must learn which matter | 2 items, all relevant |

---

## Session 9 — Chair Management + Treatment Templates (2026-07-01)

### Status: PLANNED — not yet implemented (filesystem access was blocked during session)

---

### Chair Management — Plan

**Goal:** Model physical chairs as a first-class clinic resource. Queue Board displays live chair status. Appointments and queue entries are assigned to both a doctor and a chair.

#### Database
- New table `chairs`: `id`, `clinic_id`, `name`, `status` (AVAILABLE / OCCUPIED / CLEANING / RESERVED / OUT_OF_SERVICE), `notes`, `display_order`, `is_active`
- `queue_entries`: add nullable `chair_id UUID REFERENCES chairs(id) ON DELETE SET NULL`
- `appointments`: add nullable `chair_id UUID REFERENCES chairs(id) ON DELETE SET NULL`
- Migration file: `supabase/migrations/20260701000001_chairs.sql`
- Seed: 3 chairs for CareFlow Family Clinic

#### Status Transition Map
```
AVAILABLE  → callNext()           → OCCUPIED
OCCUPIED   → completeConsultation → CLEANING
CLEANING   → markClean() (1 click)→ AVAILABLE
ANY        → outOfService()       → OUT_OF_SERVICE
OUT_OF_SERVICE → restore()        → AVAILABLE
```
Automatic: callNext auto-assigns first AVAILABLE chair; completeConsultation sets CLEANING.
Manual (1 click): CLEANING→AVAILABLE, ANY→OUT_OF_SERVICE.

#### New Files
- `supabase/migrations/20260701000001_chairs.sql`
- `apps/clinic-web/src/lib/queries/chairs.ts` — `getClinicChairs()`, `getChairsWithOccupancy()`
- `apps/clinic-web/src/lib/actions/chairs.ts` — `updateChairStatus()`, `assignChair()`
- `apps/clinic-web/src/components/queue/ChairStatusGrid.tsx` — colour-coded grid above doctor columns

#### Modified Files
- `lib/actions/queue.ts` — `callNext()` auto-assigns chair; `completeConsultation()` sets CLEANING
- `lib/queries/queue.ts` — include `chairName` on each queue entry
- `components/queue/QueueManagementView.tsx` — add `<ChairStatusGrid>` above doctor columns
- `components/queue/DoctorQueueColumns.tsx` — show chair name badge on IN_CONSULTATION cards

---

### Treatment Templates — Plan

**Goal:** Receptionists no longer manually estimate duration. Selecting a treatment auto-fills duration. Clinic owners can configure templates. Architecture supports future AI duration prediction.

#### What Already Exists (reuse)
- `treatment_type TEXT` on `appointments` + `queue_entries`
- `DEFAULT_TREATMENT_DURATIONS` hardcoded in `packages/shared/src/utils/queueEngine.ts`
- `getEstimatedDuration(doctorProfile, treatmentType)` — priority chain already built
- `doctor_treatment_stats` — accumulates real per-doctor durations
- Treatment type pills already in `AddWalkInDialog.tsx`

#### Database
- New table `treatment_templates`: `id`, `clinic_id` (NULL = global default, non-NULL = clinic override), `name`, `duration_minutes`, `display_order`, `is_active`, `ai_suggested_minutes` (nullable), `ai_confidence` (nullable)
- Unique constraint: `(clinic_id, name)`
- Migration file: `supabase/migrations/20260701000002_treatment_templates.sql`

#### Global seed defaults
| Treatment | Duration |
|---|---|
| Consultation | 15 min |
| Scaling | 30 min |
| Filling | 30 min |
| Extraction | 45 min |
| Crown | 60 min |
| Whitening | 60 min |
| Root Canal | 90 min |
| Implant | 120 min |

#### Duration Resolution Priority
1. Doctor's real history (`doctor_treatment_stats`) — most accurate
2. AI prediction (`ai_suggested_minutes` when `ai_confidence > 0.7`) — future
3. Clinic-specific template (`treatment_templates WHERE clinic_id = this clinic`)
4. Global template (`treatment_templates WHERE clinic_id IS NULL`)
5. `FALLBACK_DURATION_MINUTES` (30 min)

#### New Files
- `supabase/migrations/20260701000002_treatment_templates.sql`
- `apps/clinic-web/src/lib/queries/treatments.ts` — `getTreatmentTemplates(clinicId)`
- `apps/clinic-web/src/lib/actions/treatments.ts` — `upsertTemplate()`, `deleteTemplate()`
- `apps/clinic-web/src/components/settings/TreatmentTemplates.tsx` — owner config UI

#### Modified Files
- `apps/clinic-web/src/app/(dashboard)/settings/page.tsx` — add TreatmentTemplates section (admin only)
- `apps/clinic-web/src/components/scheduling/NewAppointmentDialog.tsx` — treatment dropdown auto-fills duration
- `apps/clinic-web/src/components/queue/AddWalkInDialog.tsx` — treatment pills source from DB templates
- `packages/shared/src/utils/queueEngine.ts` — remove hardcoded map; accept `templateDurations` as param

---

### Treatment Templates — DONE ✅

**Files created:**
- `supabase/migrations/20260701000002_treatment_templates.sql` — table, RLS, partial unique indexes, global seed (8 treatments)
- `apps/clinic-web/src/lib/actions/treatments.ts` — `fetchTreatmentTemplates()`, `upsertTreatmentTemplate()`, `deleteTreatmentTemplate()`
- `apps/clinic-web/src/components/settings/TreatmentTemplates.tsx` — inline-editable table with optimistic updates

**Files modified:**
- `packages/shared/src/utils/queueEngine.ts` — `getEstimatedDuration()` now accepts optional `templateDurations` param (backward-compatible; AI predictions slot in here in future)
- `apps/clinic-web/src/components/queue/AddWalkInDialog.tsx` — fetches templates on open; pills sourced from DB; shows `~X min` duration hint when treatment selected; passes `estimatedDurationMinutes` to `addWalkIn`
- `apps/clinic-web/src/components/scheduling/NewAppointmentDialog.tsx` — treatment type pills in notes step; duration hint displayed; `treatmentType` passed to `createStaffAppointment`
- `apps/clinic-web/src/lib/actions/queue.ts` — `addWalkIn` accepts `estimatedDurationMinutes`; uses template duration instead of recomputing from engine when provided
- `apps/clinic-web/src/lib/actions/appointments.ts` — `StaffBookingParams` gains `treatmentType`; saved to appointment after RPC (RPC predates the column)
- `apps/clinic-web/src/app/(dashboard)/settings/page.tsx` — fetches templates server-side; renders `<TreatmentTemplates>` section above Staff Accounts

**Duration resolution priority (in `getEstimatedDuration`):**
1. Doctor history (`doctor_treatment_stats`)
2. Clinic/global template (`templateDurations` param — new)
3. Hardcoded defaults (`DEFAULT_TREATMENT_DURATIONS` — fallback)
4. Doctor's default (`profile.defaultMinutes`)

**⚠️ Run migration in Supabase SQL Editor before testing:**
`supabase/migrations/20260701000002_treatment_templates.sql`

### Chair Management — DONE ✅

**Files created:**
- `supabase/migrations/20260701000003_chairs.sql` — `chairs` table, `chair_id` on `queue_entries`, RLS, 3 seed chairs
- `apps/clinic-web/src/lib/queries/chairs.ts` — `getClinicChairs()`, `ChairData` type
- `apps/clinic-web/src/lib/actions/chairs.ts` — `updateChairStatus()` server action
- `apps/clinic-web/src/components/queue/ChairStatusGrid.tsx` — compact status bar: dots, occupied-by patient name, "Mark Clean" button

**Files modified:**
- `lib/actions/queue.ts` — `callNext()` auto-assigns first AVAILABLE chair (→ OCCUPIED); `completeConsultation()` sets chair to CLEANING
- `lib/queries/queue.ts` — `QueueEntryData` gains `chairId`; `mapEntry` reads `chair_id`; select includes `chair_id`
- `queue/page.tsx` — fetches chairs, passes to `QueueManagementView`
- `QueueManagementView.tsx` — renders `<ChairStatusGrid>`, derives `chairMap`, passes to columns
- `DoctorQueueColumns.tsx` — chair name badge on CALLED/IN_CONSULTATION rows

**Status flow:** `AVAILABLE → (callNext) → OCCUPIED → (completeConsultation) → CLEANING → (Mark Clean) → AVAILABLE`

**⚠️ Run migration before testing:** `supabase/migrations/20260701000003_chairs.sql`

### Pending
- [x] ~~Fix `queue/join.tsx` (patient mobile)~~ — stale item: already fixed in Phase 3/4 (`2f0b06e`/`9dc793f`); it selects `consultation_duration_minutes`, filters on `queues.is_active`, and shows fee as a "—" placeholder. Verified against migrations 2026-09-02.
- [ ] Real patient OTP login (patient mobile dev-stub) — Phase 5.1, launch-blocking
- [x] `profiles` RLS tightening — Phase 5.2 part 1, done session 10 (see below)
- [x] `/patients` search/view/create page — Phase 5.2 part 2, done session 10 (see below)
- [ ] Apply pending migrations in Supabase SQL Editor: `20260701000002_treatment_templates.sql` (if not already run), `20260701000003_chairs.sql`, `20260902000001_profiles_rls_tighten.sql` — **the PII leak stays open until the last one runs**

---

## Session 10 — Chairs committed + profiles RLS fix (2026-09-02)

### Chair management committed
Session 9's chair implementation sat uncommitted for two months; committed as `ae974fb` after verifying `pnpm type-check` green. Also closed the stale "queue/join.tsx is broken" pending item — that bug was actually fixed back in Phase 3/4 (verified against migrations: it selects `consultation_duration_minutes`, filters `queues.is_active`).

### Phase 5.2 part 1 — profiles RLS tightened (PII leak fix)

**The leak:** `"profiles: clinic staff read"` policy was `USING (get_user_clinic_id() IS NOT NULL)` — any active staff at any clinic could read every patient profile on the platform.

**New migration `20260902000001_profiles_rls_tighten.sql`** (⚠️ run in Supabase SQL Editor):
- `staff_can_view_patient(p_patient_id)` — SECURITY DEFINER helper: true only if the caller's clinic has an appointment or queue entry for that patient. Replaces the policy's predicate (same policy name).
- `staff_lookup_patient_by_phone(p_phone)` — SECURITY DEFINER RPC, the one sanctioned path to a patient with no prior relationship to the clinic (first visit). Staff-only (raises `NOT_CLINIC_STAFF`), exact phone match, returns only `(id, full_name)`, writes a `PATIENT_PHONE_LOOKUP` row to `activity_log` per Phase 5.3's audit requirement.
- Guest walk-in profiles become visible to staff the moment `join_queue` inserts their entry; platform console (admin client) and patient owner-reads unaffected.

**Code changes (clinic-web):**
- New `src/lib/patients.ts` — `findPatientByPhone(supabase, phone)`: tries the RPC, falls back to a direct `profiles` read if the RPC errors (migration not applied yet — graceful-degradation pattern, same as `record_consultation_complete`). After the migration, the fallback can only see clinic-related patients anyway.
- `actions/appointments.ts` — `createStaffAppointment` + `lookupPatientByPhone` now use `findPatientByPhone` (were direct global reads via server client)
- `actions/queue.ts` — `quickCheckInByCode` phone fallback and `addWalkIn` existing-patient lookup now use `findPatientByPhone` (walk-in lookup previously used the admin client — now audited)

**Rule going forward:** never add a direct global `profiles` query with the server client; use `findPatientByPhone`.

**Suspected latent bug (flagged, not fixed):** `profiles.phone_number` is `NOT NULL UNIQUE` in both schema migrations, but the guest/emergency upserts write only `{ id, full_name }` with no error check — the phone-less walk-in flow may be silently broken unless the live DB was hand-altered. Needs verification against the live schema.

### Phase 5.2 part 2 — `/patients` page

Patients module for clinic staff (Queue/Appointments/Patients in the ops nav for every role; `/patients` added to `ROUTE_PERMISSIONS`).

**New files:**
- `lib/queries/patients.ts` — `getClinicPatients()`: roster built from DISTINCT patients with appointments or queue entries at the clinic (explicitly relationship-scoped — identical results whether or not the RLS migration is applied; never a bare `profiles` select), with per-patient appointment/queue counts + last visit; profile fetch chunked `.in()` batches of 200
- `lib/actions/patients.ts` — `createPatient()` (find-or-create by phone: audited RPC lookup → `admin.auth.admin.createUser({ phone, phone_confirm })` + profile upsert, mirrors `addWalkIn`; logs `PATIENT_CREATED` to `activity_log`; returns `existed: true` instead of erroring on duplicates) + `fetchPatientHistory()` (last 20 appointments at caller's clinic)
- `app/(dashboard)/patients/page.tsx` + `loading.tsx`
- `components/patients/PatientsView.tsx` — client-side search (name/phone), roster table, right-hand detail panel with lazy-loaded appointment history
- `components/patients/AddPatientDialog.tsx` — name + phone; "already registered" success state on duplicate phone

**Modified:**
- `packages/shared/src/types/auth.ts` — `/patients` route permission (all clinic roles)
- `components/shared/SidebarNav.tsx` — Patients nav item in ops section
- `components/scheduling/NewAppointmentDialog.tsx` — patient step now offers inline "Register & Continue" (name field) when phone lookup finds nobody, instead of the dead-end "ask them to register via the app" error — closes the Group B "Add Patient dialog" item

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
