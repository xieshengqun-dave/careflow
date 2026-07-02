# CareFlow — Technical Audit Report

**Audited:** 2026-06-29  
**Auditor:** Claude (claude-sonnet-4-6)  
**Scope:** Full monorepo — clinic-web, patient-mobile, packages/shared, supabase/migrations

---

## 1. Existing Features

### Clinic Web (`apps/clinic-web`)

| Feature | Status | Notes |
|---|---|---|
| Email/password login | ✅ Working | Staff only |
| Forgot / reset password | ✅ Working | Supabase auth flow |
| Dashboard metrics | ✅ Working | Today's appts, queue count, no-show rate, wait time |
| Appointments list view | ✅ Working | Grouped by doctor, inline status actions |
| Appointments slot view | ✅ Working | 7-column weekly slot grid |
| New Appointment dialog | ✅ Working | 4-step wizard, requires `staff_book_appointment` RPC |
| Queue management board | ✅ Working | Per-doctor columns, real-time via Supabase Realtime |
| Queue actions | ✅ Working | Call next, skip, requeue, move to top, complete, remove, pause/resume, reassign doctor |
| Smart queue wait estimates | ✅ Working | ~Xm wait shown per WAITING entry; computed by `queueEngine.ts` using doctor treatment stats |
| Arrival status tracking | ✅ Working | EARLY/LATE badge on check-in; stored as `arrival_status` on queue_entry |
| Actual duration tracking | ✅ Working | `record_consultation_complete` RPC records called_at→now duration on completion |
| Doctor treatment stats | ✅ Working | `doctor_treatment_stats` table; auto-updated on each completion; feeds queue engine |
| Add walk-in | ✅ Working | Phone optional, queue depths shown, treatment type, via `join_queue` RPC |
| Quick check-in (code/phone) | ✅ Working | Persistent bar on Queue page — no navigation needed |
| Emergency fast-track | ✅ Working | One-click, auto front-of-queue, name only required |
| Staff reschedule | ✅ Working | Reschedule button on every CONFIRMED appointment row |
| Overdue no-show sweep | ✅ Working | Auto-highlights 15+ min overdue; batch mark no-show button |
| Doctor schedule management | ✅ Working | Weekly recurring schedules |
| Doctor CRUD | ❌ Broken | Field mismatches — see Technical Debt #1 |
| Clinic settings | ✅ Working | Name, operating hours, contact |
| Platform console | ✅ Working | Overview, Clinics + staff management, Doctors, Patients (all with clinic selector) |
| Staff role management | ✅ Working | Platform admin can set DOCTOR/RECEPTIONIST/CLINIC_ADMIN roles per clinic |
| Staff password reset | ✅ Working | Platform admin + clinic_admin can set passwords via Supabase auth.admin |
| Loading skeletons | ✅ Working | All dashboard pages have `loading.tsx` |

### Patient Mobile (`apps/patient-mobile`)

| Feature | Status | Notes |
|---|---|---|
| Login | ⚠️ Dev stub | Hardcoded `signInWithPassword` — not real OTP |
| OTP screen | ⚠️ Unreachable | Screen works if navigated to directly; login never calls it |
| Home screen | ✅ Working | Clinic list, hero card, skeleton loading |
| Find Clinics / search | ✅ Working | TRGM search |
| Clinic details | ✅ Working | Doctor list, operating hours |
| Doctor schedule / slot picker | ✅ Working | Date picker + slot grid |
| Booking confirmation | ✅ Working | Summary + `book_appointment` RPC |
| My Appointments | ✅ Working | List with cancel + reschedule |
| Reschedule screen | ✅ Working | Slot picker → `reschedule_appointment` RPC |
| Check-In screen | ✅ Working | 6-char code for desk; links to queue tracking when checked in |
| Queue tracking (live) | ⚠️ Partial | Realtime subscription works; progress feed is hardcoded/fake |
| Join Queue | ❌ Broken | Selects `consultation_fee` + `queues.status` — both non-existent columns |
| Notifications | ✅ Working | Derived from `notifications` table; `is_read` persisted |
| Profile tab | ✅ Working | Basic display |
| Push notifications | ⚠️ Infra only | DB triggers + Edge Function wired; requires EAS project ID + Vault secret |

### Database / Backend

| Feature | Status |
|---|---|
| `book_appointment()` RPC | ✅ Applied |
| `cancel_appointment()` RPC | ✅ Applied |
| `check_in_appointment()` RPC | ✅ Applied |
| `join_queue()` RPC | ✅ Applied |
| `staff_book_appointment()` RPC | ✅ Applied |
| `reschedule_appointment()` RPC | ✅ Applied |
| `record_consultation_complete()` RPC | ✅ Applied |
| `doctor_breaks` table | ✅ Applied |
| `doctor_treatment_stats` table | ✅ Applied |
| Smart queue fields on `queue_entries` | ✅ Applied (`estimated_duration_minutes`, `actual_duration_minutes`, `scheduled_start_time`, `arrival_status`) |
| Push notification dispatch | ✅ Applied (needs Vault secret + pg_net) |
| Appointment reminder cron | ✅ Applied (needs pg_cron enabled) |
| Slot generation Edge Function | ⚠️ Manual trigger only |
| Audit log (`activity_log`) | ⚠️ Partial — status changes only |
| Platform admins table | ✅ Applied |
| RLS policies | ✅ Comprehensive — one known PII gap (see Security #1) |

---

## 2. Missing Features

### 🔴 Critical

| # | Feature | Reason |
|---|---|---|
| C1 | **Real patient OTP login** | App is unusable for real patients. Dev stub with hardcoded credentials cannot ship. |
| C2 | **Fix `queue/join.tsx`** | Queries `consultation_fee` and `queues.status` — both non-existent. Postgrest silently drops the whole query. Join Queue is broken for all patients. |
| C3 | **Fix Doctor CRUD** | `addDoctor()` and `updateDoctor()` insert/update `full_name`/`email` on `clinic_staff` — columns don't exist. Doctor management is completely non-functional. |

### 🟡 Important

| # | Feature | Reason |
|---|---|---|
| I1 | **Patient onboarding (name capture)** | New OTP users have no `full_name`; affects every screen that greets the patient. |
| I2 | **Automated slot generation** | Slots must be generated manually via Edge Function. Without automation, tomorrow's bookings break if no one runs it. |
| I3 | **Live queue progress feed** | `queue/[queueId].tsx` shows a hardcoded scripted feed with fake timestamps. Must be replaced before any patient-facing demo. |
| I4 | **AI queue optimization** | Core product differentiator per mission statement. Not started. |
| I5 | **Analytics / reporting** | Mission calls for analytics as a primary pillar. Only today's snapshot metrics exist; no trends, history, or export. |
| I6 | **Tighten patient profile RLS** | Staff can read all patient profiles platform-wide — a PII leak across all clinics. |
| I7 | **Patients module (clinic-web)** | No `/patients` page. Reception can only look up patients via the New Appointment dialog. |

### 🟢 Optional

| # | Feature |
|---|---|
| O1 | Platform — Doctors page (stub exists) |
| O2 | Platform — Patients page (stub exists) |
| O3 | Platform — Onboard Clinic flow |
| O4 | "Add to Calendar" on booking confirmation (button present, not wired) |
| O5 | Real clinic photos via Supabase Storage |
| O6 | Real geolocation / distances on clinic cards (hardcoded `4.8★`) |
| O7 | SMS / WhatsApp fallback reminders |
| O8 | Walk-in ETA estimate shown to patient in queue tracking |
| O9 | Receptionist access to schedule management (currently clinic_admin-only) |

---

## 3. Technical Debt

### 🔴 Critical

**TD1 — Doctor CRUD field mismatch**  
`doctors/page.tsx:14` and `actions/doctors.ts:41,70` select and insert `full_name`/`email` on `clinic_staff`. These columns do not exist. Doctor names must come from `auth.users.user_metadata` via `user_id`.

**TD2 — `profiles.phone` vs `profiles.phone_number`** ✅ FIXED (2026-06-29)  
Fixed in `queries/appointments.ts` and `actions/appointments.ts` (`lookupPatientByPhone`, `createStaffAppointment`).

**TD3 — `.single()` instead of `.maybeSingle()`** ✅ FIXED (2026-06-29)  
Fixed in `actions/appointments.ts:lookupPatientByPhone` and `createStaffAppointment`.

**TD4 — `queue/join.tsx` invalid column selects**  
Selects `consultation_fee`, `consultation_duration` on `doctors` and `queues.status` instead of `queues.is_active`. Postgrest silently returns no rows. Join Queue is silently broken.

### 🟡 High

**TD5 — Platform admin may exist in both `platform_admins` and `clinic_staff`** (discovered 2026-06-30)
If `admin@careflow.asia` was added to `clinic_staff` (e.g., via Doctor CRUD UI or manual insert), `getServerUser()` can fall through to the `clinic_staff` branch when the `platform_admins` check fails, returning a non-null `clinicId`. This causes all platform queries scoped by `user.clinicId ?? scopeClinicId` to ignore the URL param and show data from the wrong clinic. Fixed in `getClinicStaff` by reversing the operand order to `scopeClinicId ?? user.clinicId`. The data anomaly (admin in `clinic_staff`) remains in DB and should be cleaned up manually.

**TD6 — N+1 slot queries**  
`queries/slots.ts:42–103` runs 3 sequential DB queries per doctor inside a loop. With 10 doctors: 30 queries per page load. Needs batching with `.in()` + `Promise.all()`.

**TD7 — N+1 platform clinic stats**  
`queries/platform.ts:59–96` runs 3 count queries per clinic inside a loop. 100 clinics = 300 queries. Needs batching + pagination.

**TD8 — Hardcoded dev credentials in production code**  
`(auth)/login.tsx` has `DEV_TEST_EMAIL` and `DEV_TEST_PASSWORD` as string constants. Visible in source maps and crash reports. Move to `.env.local`.

**TD9 — Fabricated patient profile in `authStore.ts`**  
Dev-mode login creates a `profiles` row with `full_name: "Test Patient"` and a synthetic phone number that persists in the production DB.

**TD10 — Middleware role comparison is fragile**  
`middleware.ts:74` lowercases the DB enum value and compares to `ROUTE_PERMISSIONS` keys. Works by accident for most roles but has no explicit mapping and breaks if enum values change.

### 🟠 Medium

**TD10 — 44+ `as unknown as {...}` type assertions**  
Across all query files. Type mismatches are undetectable at compile time. Supabase response shapes should be validated with Zod or explicit runtime checks.

**TD11 — No structured logging**  
`console.error(error.message)` used throughout with no context (no user ID, clinic ID, request ID). No error tracking integration.

**TD12 — Incomplete audit log**  
`activity_log` covers appointment/queue status changes only. Missing: schedule edits, doctor additions, staff role changes, clinic settings updates.

**TD13 — `PENDING` appointment status is dead code**  
Exists in the enum but no code path ever creates a PENDING appointment. Either remove it or document it as reserved.

**TD14 — Slot generation is manually triggered**  
No cron schedule exists. Operationally fragile.

---

## 4. Duplicate Logic

| Logic | Files | Recommended Fix |
|---|---|---|
| Extract doctor name from `clinic_staff` (handle object or array) | `queries/appointments.ts`, `queries/dashboard.ts`, `queries/queue.ts`, `queries/slots.ts` — 10+ occurrences | Extract `getStaffName(staff)` to `packages/shared` |
| `.slice(0, 5)` for `HH:MM` time formatting | Every query file + both apps | Extract `formatTime(t: string)` to `packages/shared` |
| Active queue filter: `["WAITING","CALLED","IN_CONSULTATION"].includes(status)` | `dashboard.ts`, `platform.ts`, `queue.ts`, `queue/join.tsx` | Export `ACTIVE_QUEUE_STATUSES` constant from `packages/shared` |
| MYT current time calculation `(utcHours + 8) % 24` | `dashboard.ts` and elsewhere | Add `getMYTNow()` returning `HH:MM` to `packages/shared` |
| Patient phone lookup by phone number | `actions/appointments.ts:lookupPatientByPhone` + walk-in dialog | Consolidate into one reusable server action |
| Slot period classification (Morning / Afternoon / Evening) | `booking/[doctorId].tsx`, `booking/reschedule.tsx` | Extract to `packages/shared` |

---

## 5. Components That Can Be Reused

| Component | Currently | Should Be |
|---|---|---|
| Stat / metric card (icon + colored bg + value + unit) | Rebuilt separately in `QueueManagementView`, `platform/overview` | Single `<StatCard>` in `components/shared/` |
| Status pill (colored dot + label + `rounded-md`) | Rebuilt in `AppointmentList`, `QueueManagementView`, patient-mobile cards | Single `<StatusBadge status={...} />` |
| Empty state (icon + message + optional CTA) | Rebuilt in queue table, platform pages, patient-mobile screens | Single `<EmptyState icon message cta? />` |
| Table wrapper (`rounded-[18px]` + border + shadow + `bg-[#F8FAFC]` thead) | Rebuilt in `AppointmentList`, `QueueManagementView`, `platform/overview` | Single `<DataTable>` wrapper |
| Doctor avatar (colored circle with initial, 6 preset colors by name hash) | Patient-mobile booking + clinic-web doctor cards | Shared avatar utility |
| Date chip picker (horizontal scroll, day/date/month) | `booking/[doctorId].tsx`, `booking/reschedule.tsx` | Extract `<DateChipPicker>` component |
| Page header (title + subtitle + right-side actions) | Rebuilt inline on every dashboard page | Single `<PageHeader title description actions />` |
| Skeleton loaders | Patient-mobile has `Skeleton.tsx`; clinic-web rebuilds inline | Extend `Skeleton.tsx` pattern to clinic-web |

---

## 6. Security Concerns

### 🔴 High

**S1 — Patient PII leak via RLS gap**  
`profiles` RLS allows any active clinic staff to read any patient profile on the entire platform. A receptionist at Clinic A can read patient records from Clinic B. Fix: restrict to patients with appointments or queue entries at the staff member's own clinic.

**S2 — Hardcoded dev credentials in production bundle**  
`login.tsx` constants `DEV_TEST_EMAIL` / `DEV_TEST_PASSWORD` appear in source maps and crash reports. Strip in production.

**S3 — Queue actions lack explicit clinic scoping**  
`skipEntry()`, `moveToTop()`, `removeEntry()` update by `entry_id` only, relying solely on RLS to prevent cross-clinic writes. RLS does catch it, but errors are opaque. Add explicit clinic_id validation before the update for defence in depth.

### 🟡 Medium

**S4 — No rate limiting on auth endpoints**  
Relevant once real OTP login is live. Implement rate limiting on the OTP send endpoint.

**S5 — Service role key scope**  
`createAdminClient()` is correct for server use. Verify `SUPABASE_SERVICE_ROLE_KEY` is never referenced in any `"use client"` file or passed to the browser.

**S6 — `platform_admins` has no insert/update RLS**  
No policy prevents a rogue server action from inserting new platform admins. Fine with one admin; needs hardening at scale.

---

## 7. Performance Concerns

| # | Concern | Location | Impact |
|---|---|---|---|
| P1 | N+1 slot queries (3 per doctor) | `queries/slots.ts:42–103` | 30 queries with 10 doctors; blocks appointments + schedule page |
| P2 | N+1 clinic stat queries (3 per clinic) | `queries/platform.ts:59–96` | Unusable at 100+ clinics |
| P3 | No pagination | Platform clinics, appointment list, notifications | Full table scans; degrades as data grows |
| P4 | Missing index on `appointments(appointment_date, clinic_id)` | Dashboard metrics + appointment list | Full table scan on busiest query |
| P5 | Missing index on `queue_entries(appointment_id)` | Check-in function + audit triggers | Sequential scan on every check-in |
| P6 | Missing index on `notifications(user_id, is_read)` | Notifications query | Sequential scan on every notification load |
| P7 | `getAllClinics()` called twice on platform overview | `platform/overview/page.tsx` | Same data fetched twice per page load |
| P8 | No server-side caching | All dashboard queries | Every navigation triggers fresh DB queries |

---

## 8. UI Inconsistencies

| # | Inconsistency | Locations |
|---|---|---|
| U1 | **Status pill radius** — `rounded-full` vs `rounded-md` | Patient-mobile uses `rounded-full`; clinic-web queue uses `rounded-md`; mixed in appointment list |
| U2 | **Card radius** — `rounded-xl` vs `rounded-[18px]` vs `rounded-2xl` | No single standard across pages |
| U3 | **Button primary color** — `bg-cf-primary-700` vs `bg-blue-600` vs ShadCN `bg-primary` | Mixed across clinic-web components |
| U4 | **Hardcoded colors in patient-mobile** | Several screens use `#1A6FD8` directly instead of `palette.primary700` from tokens |
| U5 | **Table header background** — `bg-[#F8FAFC]` vs `bg-slate-50/60` | Should be one design token |
| U6 | **Table header font weight** — `font-semibold` vs `font-bold uppercase tracking-wide` | No single standard |
| U7 | **Doctor avatar** — ShadCN `Avatar` in clinic-web vs custom colored `View` with initial in patient-mobile | Same concept, completely different implementations |
| U8 | **Empty state** — different icons, layouts, and copy on every screen | No shared `<EmptyState>` component |
| U9 | **Back navigation (mobile)** — `router.back()` vs `router.replace()` vs `router.push()` used interchangeably | Inconsistent stack behaviour |
| U10 | **Loading indicators** — ShadCN skeleton divs in clinic-web; `ActivityIndicator` vs custom `Skeleton` in patient-mobile | No unified loading pattern |
| U11 | **Error display** — inline red text vs browser `Alert()` vs silent empty list | No consistent error feedback pattern |

---

## Tracking Status

Use the tags below to track resolution:

- `[ ]` Not started
- `[~]` In progress  
- `[x]` Resolved

### Critical Fixes
- [ ] C1 — Real patient OTP login
- [ ] C2 — Fix `queue/join.tsx` invalid column selects
- [ ] C3 — Fix Doctor CRUD (`full_name`/`email` on `clinic_staff`)
- [ ] TD1 — Doctor CRUD field mismatch
- [x] TD2 — `profiles.phone` → `profiles.phone_number` ✅ fixed 2026-06-29
- [x] TD3 — `.single()` → `.maybeSingle()` ✅ fixed 2026-06-29
- [ ] TD4 — `queue/join.tsx` invalid columns

### Important Fixes
- [ ] I1 — Patient onboarding
- [ ] I2 — Automated slot generation cron
- [ ] I3 — Live queue progress feed
- [ ] I4 — AI queue optimization
- [ ] I5 — Analytics / reporting
- [ ] I6 — Tighten patient profile RLS (S1)
- [ ] I7 — Patients module in clinic-web
- [ ] TD5 — N+1 slot queries
- [ ] TD6 — N+1 platform clinic stats
- [ ] TD7 — Remove hardcoded dev credentials
- [ ] TD8 — Remove fabricated patient profile
- [ ] S3 — Queue actions clinic scoping

### Refactoring
- [ ] DL1 — Extract `getStaffName()` helper
- [ ] DL2 — Extract `formatTime()` helper
- [ ] DL3 — Export `ACTIVE_QUEUE_STATUSES` constant
- [ ] DL4 — Add `getMYTNow()` to shared
- [ ] DL5 — Consolidate patient phone lookup
- [ ] DL6 — Extract slot period classifier
- [ ] RC1 — `<StatCard>` shared component
- [ ] RC2 — `<StatusBadge>` shared component
- [ ] RC3 — `<EmptyState>` shared component
- [ ] RC4 — `<DataTable>` wrapper component
- [ ] RC5 — `<PageHeader>` shared component
- [ ] RC6 — `<DateChipPicker>` shared component

### Performance
- [ ] P1 — Batch slot queries
- [ ] P2 — Batch platform clinic stat queries
- [ ] P3 — Pagination on clinics + appointments + notifications
- [ ] P4 — Add index `appointments(appointment_date, clinic_id)`
- [ ] P5 — Add index `queue_entries(appointment_id)`
- [ ] P6 — Add index `notifications(user_id, is_read)`
- [ ] P7 — Deduplicate `getAllClinics()` call on platform overview
