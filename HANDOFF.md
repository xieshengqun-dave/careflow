# CareFlow — Session Handoff

**Last updated:** 2026-06-22
**Branch:** `main`
**Repo:** https://github.com/xieshengqun-dave/careflow (private)

---

## What Was Built This Session (2026-06-22)

### Clinic Dashboard rebuilt to match mockup
`apps/clinic-web/src/app/(dashboard)/dashboard/page.tsx` was a bare MVP (greeting + 4 generic metrics + two info cards). Rebuilt to match `/UI/Clinic Dashboard.png`:
- 4 metric cards: Today's Appointments, In Queue, Patients Today, Completed Today (swapped the mockup's "Revenue Today" — no fee column exists anywhere in the schema, so this wasn't fabricated)
- Live Queue Overview donut chart (`recharts`) + legend
- Today's Appointments list, Doctor Schedule Today, Today's Overview bar chart, Recent Activity feed (built from real `updated_at` timestamps, not fake data)
- Real CSV export ("Export Report") of today's appointments
- New query functions in `src/lib/queries/dashboard.ts`: `getQueueStatusBreakdown`, `getDoctorScheduleToday`, `getRecentActivity`
- New components in `src/components/dashboard/`

### Bug fixes
- **Tailwind was producing zero CSS app-wide** — `apps/clinic-web/postcss.config.mjs` didn't exist. Added it. (Discovered while visually verifying the dashboard rebuild — every clinic-web page was rendering unstyled.)
- **"No upcoming appointments" even with real data** — `appointments.tsx` (patient-mobile) selected `consultation_fee`, a column that doesn't exist on `appointments`. Postgrest silently failed the whole query. Removed the bad column; fee now shows "—" since there's no fee data in the schema.
- **Headers overlapping the status bar** (e.g. "My Appointments" title) — every screen imported `SafeAreaView` from `"react-native"` core, which is a no-op on Android. Replaced with `react-native-safe-area-context`'s `SafeAreaView` everywhere, wrapped root layout in `SafeAreaProvider`, added `edges={["top"]}` to header-only wrappers.
- **Logo not used anywhere** — `apps/patient-mobile/app.json` referenced `assets/icon.png` / `splash.png` / `adaptive-icon.png`, none of which existed (a real native build would've failed). Generated them from `/UI/logo.png`. Replaced the hand-built placeholder icon+text on Login with the real logo image; same for the clinic-web sidebar and staff login page (`apps/clinic-web/public/logo.png`).

### Repo
- CareFlow had no git history before this session (the `.git` actually lived at the home-directory level, unrelated to this project). Initialized a proper repo scoped to `CareFlow/`, and pushed to a new **private** GitHub repo: `xieshengqun-dave/careflow`.

---

## Known Bugs Found But NOT Yet Fixed

- **`apps/patient-mobile/src/app/queue/join.tsx` is likely broken** — selects `consultation_fee` and `consultation_duration` on `doctors` (neither column exists; real columns are `consultation_duration_minutes` and no fee column at all), and queries `.eq("status", "ACTIVE")` on `queues` (the real column is the boolean `is_active`). Same failure mode as the appointments bug above — the whole query silently returns nothing.
- **`apps/patient-mobile/src/app/(auth)/login.tsx` is a dev-mode stub, not real phone OTP.** It calls `supabase.auth.signInWithPassword()` with a hardcoded dev email/password and never navigates to `otp.tsx`. The OTP screen itself renders fine if reached directly, but the real OTP flow isn't wired up.
- **`apps/patient-mobile/src/app/queue/[queueId].tsx` (Queue Tracking) injects fake data** — a hardcoded "Live Queue Updates" feed (scripted patient call-ins with fixed timestamps) is unconditionally appended after the real updates, and the total-patient count / step timestamps are hardcoded math, not real data (lines ~390, ~441–444, ~464–481).
- **Clinic Web Queue Management page** (`/queue`) doesn't match its mockup — implemented as a per-doctor Kanban board, while the mockup shows a single overview table + stat-cards row + patient detail side panel. Not yet rebuilt.
- **No "create appointment" flow exists on clinic-web.** The dashboard's "New Appointment" button currently just links to the slot view; there's no staff-initiated booking action.

---

## What Was Built Previously (2026-06-20 session)

### Patient Mobile App — Full Rebuild (12 screens)

All screens were rebuilt from scratch to match the PNG mockups in `/UI/`.

| Screen | File | Status |
|---|---|---|
| Login | `(auth)/login.tsx` | ⚠️ Dev-mode stub, see above |
| OTP Verification | `(auth)/otp.tsx` | ✅ Renders correctly, unreachable from Login |
| Home | `(tabs)/index.tsx` | ✅ Done |
| Check-in | `(tabs)/checkin.tsx` | ✅ Done |
| My Appointments | `(tabs)/appointments.tsx` | ✅ Fixed this session |
| Notifications | `(tabs)/notifications.tsx` | ✅ Done |
| Profile | `(tabs)/profile.tsx` | ✅ Done |
| Find Clinics | `clinic/search.tsx` | ✅ Done |
| Clinic Details | `clinic/[clinicId].tsx` | ✅ Done |
| Doctor Schedule (Booking) | `booking/[doctorId].tsx` | ✅ Done |
| Booking Confirmation | `booking/confirm.tsx` | ✅ Done |
| Join Queue | `queue/join.tsx` | ⚠️ Likely broken query, see above |
| Queue Tracking (Live) | `queue/[queueId].tsx` | ⚠️ Has fake data, see above |
| Tab Layout (5-tab + FAB) | `(tabs)/_layout.tsx` | ✅ Done |
| Root Layout | `_layout.tsx` | ✅ Done |

**Shared files:**
- `src/components/Icon.tsx` — Ionicons type-cast wrapper (critical, see CLAUDE.md)
- `src/constants/theme.ts` — Full design token system
- `src/lib/api/appointments.ts`, `clinics.ts`, `queues.ts`, `slots.ts`, `notifications.ts`

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
- [ ] **Fix `queue/join.tsx`** — see "Known Bugs Found But NOT Yet Fixed" above
- [ ] **Wire up real phone-OTP login** — Login currently bypasses it entirely (see above)
- [ ] **Remove the fabricated data in Queue Tracking** (`queue/[queueId].tsx`)
- [ ] **Enable Realtime** on `queue_entries` and `queues` tables in Supabase dashboard
  - Dashboard → Database → Replication → Tables → toggle both on
  - Run: `ALTER TABLE queue_entries REPLICA IDENTITY FULL;`
- [ ] **Seed doctor schedule data** — time slots are generated from `doctor_schedules`. Without seed data, the Doctor Schedule screen (`booking/[doctorId].tsx`) shows no slots.
- [ ] **Set a real password for a staff seed account** (or create one) to actually test clinic-web — `supabase/seed.sql` accounts have an empty password.

### Nice to Have

- [ ] **Real ratings/geolocation** — Clinic cards show hardcoded `4.8★` and `1.2 km`. Add a `ratings` table or integrate Google Places.
- [ ] **Push notifications** — Firebase FCM token registration is scaffolded but the Edge Function (`supabase/functions/send-notification/`) wiring is not tested end-to-end.
- [ ] **Clinic photos** — No real photos in Supabase Storage. Currently using colored placeholder Views with initial letter.
- [ ] **Reschedule flow** — "Reschedule" button on appointments screen navigates to Home. Full rescheduling (pick new slot) is not implemented.
- [ ] **"Add to Calendar"** on booking confirmation — button is present but calendar API integration (`expo-calendar`) is not wired.
- [ ] **Doctor schedule generation** — The `generate-slots` Edge Function creates `time_slots` from `doctor_schedules`. It needs to be called periodically or on-demand.
- [ ] **Clinic web: Doctor CRUD** — verify `apps/clinic-web/src/app/(dashboard)/doctors/` is complete.
- [ ] **Clinic web: Queue Management page** — rebuild to match `/UI/queue management.png` (see "Known Bugs" above)
- [ ] **Real "New Appointment" flow on clinic-web** — currently just links to the slot view.

---

## Known Issues / Gotchas

### TypeScript Pre-existing Errors (typed routes, unrelated to recent changes)
- `(tabs)/_layout.tsx` — tabBarButton onPress type mismatch
- `(tabs)/appointments.tsx`, `clinic/[clinicId].tsx`, `queue/join.tsx` — expo-router typed-route string literals not matching generated route types

These don't block Metro/dev builds (`skipLibCheck: true` in `patient-mobile/tsconfig.json` mitigates most cross-package issues), but `pnpm typecheck` will surface them.

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

### SafeAreaView
Always import from `react-native-safe-area-context`, never `"react-native"` core — see CLAUDE.md.

### No fee/price column in the schema
Don't `select` `consultation_fee` or similar on `appointments`/`doctors` — it doesn't exist and Postgrest will silently fail the whole query. See CLAUDE.md.

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
