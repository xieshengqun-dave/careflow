# Handoff: CareFlow — Patient App & Clinic Dashboard

## Overview
CareFlow is a **smart queue & appointment management** product for clinics, with two surfaces:

1. **Patient mobile app** (12 screens) — find clinics, book appointments, join walk-in queues, and track queue position in real time.
2. **Clinic web dashboard** (4 primary views) — staff overview, appointment management, live queue management, and doctor schedules.
3. **Platform operator console** (NEW — login + 7 views) — the vendor's multi-tenant super-admin area: network overview, all clinics/doctors/patients, and a clinic-onboarding flow, each with full loading/empty/error states.

This package is the design reference for building the **React Native / Expo** mobile app (primary target) and, optionally, the web dashboard.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes that show the intended look, layout, and behavior. **They are not production code to copy directly.**

Your task is to **recreate these designs in the target codebase** — a React Native / Expo app — using its own components, navigation library, and patterns. Treat the HTML/CSS as a precise visual + interaction spec, not as source to port line-by-line. (The web dashboard, if built, should be recreated in React/Tailwind or your chosen web stack.)

Three ways to view the prototypes:
- Open the `*.standalone.html` files in any browser (fully offline, no build step).
- Or open the `*.dc.html` source files in the design tool they came from.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interactions are final. Recreate the UI faithfully using the exact token values in `theme/careflow-tokens.ts` and documented below. Imagery (clinic photos, doctor headshots, illustrations) is shown as **labeled placeholders** — swap in real assets.

---

## Design Tokens
Authoritative values live in **`theme/careflow-tokens.ts`** (drop-in for Expo). Summary:

**Color**
- Primary 600 `#2563EB` (links, active icons) · Primary 700 `#1D4ED8` (filled buttons) · Hero end `#1E40AF`
- Green 600 `#16A34A` / 500 `#22C55E` (queue, success, walk-in)
- Accent purple `#7C3AED` · Star `#FBBF24`
- Status: warning `#F59E0B` · danger `#EF4444`/`#DC2626`
- Text: `#0F172A` (primary) · `#64748B` (secondary) · `#94A3B8` (tertiary/placeholder)
- Surfaces: `#FFFFFF` · app bg `#F6F8FB` · hairline border `#EEF2F6`
- Tints (badge backgrounds): blue `#EFF4FF` · green `#E6F8EE` · amber `#FEF3E2` · red `#FEF2F2` · purple `#F3EEFE`
- Brand gradient `#2563EB → #22C55E` (135°); hero card gradient `#2563EB → #1E40AF`

**Type** — Plus Jakarta Sans (400/500/600/700/800). Display 30/800 · H1 24/800 · H2 19/800 · H3 16/800 · Body 14/500 · Label 13/600 · Caption 11/600. Headings use negative letter-spacing (~ -0.02em).

**Spacing** 4 · 8 · 12 · 16 · 20 · 24 · 30
**Radius** chips 8 · inputs/buttons 12 · cards 16 · hero/sheets 20 · pill 999 · avatars full
**Shadow** card `0 1px 3px rgba(15,23,42,.05)` · floating button `0 8px 18px -8px rgba(29,78,216,.6)` · modal `0 16px 40px -16px rgba(15,23,42,.25)`

**Status badge presets** (`status` export): open / inQueue / withDoctor / completed = green-on-green50; confirmed / checkedIn = blue-on-blue50; waitingNext / onBreak = amber-on-amber50; waiting / upcoming / offline = slate-on-slate100; noShow / cancelled = red-on-red50; followUp = purple-on-purple50.

---

## Screens — Patient Mobile App (390×844, iOS)
A shared status bar sits above a scrollable content area; main screens show a bottom tab bar (Home · Appointments · **Check-In** center FAB · Queue · Profile). Active tab = primary `#2563EB`, inactive = `#94A3B8`. The center Check-In is a 54px blue circle elevated -22px with a 4px white ring.

1. **Splash** — centered logo + tagline, soft blue→green wave gradient at the bottom. Auto-advance / tap → Login.
2. **Login** — phone input with `🇲🇾 +60` country selector, "Send OTP" (primary), Google / Apple SSO, terms footer. → OTP.
3. **OTP Verify** — six boxed digits (active box has 4px focus ring), 45s expiry + resend, security illustration placeholder. → Home.
4. **Home** — greeting + bell (badge), search bar, **blue queue hero card** (`A029`, people ahead, est. wait, View Queue Details), 4 quick-action tiles (Book / Join Queue / Track Queue / Find Clinics, each its own tint), Nearby Clinics list, notification opt-in banner.
5. **Find Clinics** — location pill, search + filter, horizontally-scrolling category chips (active = filled blue), result count + sort, clinic cards (photo, name, verified type, rating, distance, Open badge, service tags).
6. **Clinic Details** — photo header with gallery counter + back/heart/share overlays, clinic identity, 4 action buttons (Call/Directions/Save/Website), address + map placeholder + hours, About, service chips, horizontal doctor cards, sticky bottom bar (Join Queue / Book Appointment).
7. **Doctor Schedule** — doctor card + fee, current-queue / walk-in-wait strip, horizontal date selector (selected = filled blue), legend (Available/Booked/Break/Selected), time-slot rows colored by state (tap available to select), sticky bar (Join Queue Now / Book Appointment).
8. **Booking Confirmation** — green success hero, appointment detail card (doctor, date, time, type, fee + Paid pill), "What happens next" info, Add-to-Calendar row, View My Appointments (outline) / Back to Home (primary).
9. **My Appointments** — tabs Upcoming / Completed / Cancelled (underline indicator). Cards grouped Today / Upcoming / Later with a left accent bar (green=today, blue, purple), status pill, fee + duration, Reschedule / Cancel actions; empty states for other tabs.
10. **Join Queue** — doctor card, large "6 patients ahead" + est. wait, 3-up "you'll be notified" row, validity notice, "Why Join Queue" row, sticky Join Queue Now. → Queue Tracking.
11. **Queue Tracking** — "You're in the queue" banner, doctor card, 3-stat row (queue #, est. wait, ahead), 4-step progress stepper (Joined → In Queue → With Doctor → Completed), Live Queue Updates feed, note callout, Leave Queue.
12. **Notifications** — category tabs with counts, items grouped Today / Yesterday / This Week, colored type icon + unread dot, enable-push banner.

*(A bonus Profile screen is included for the tab; not in the original mockups.)*

### Patient app — added screens & states — NEW
Reached via the in-frame screen picker (options 13–16); all match the patient-app phone style.
- **Onboarding / name capture** (13) — shown right after OTP verify (OTP → onboarding → home): warm blue→green hero, avatar, "Welcome to CareFlow 👋", single Name field (focused), Skip / Continue.
- **Check-In** (14) — opened by the center Check-In tab. Segmented toggle between **Scan QR Code** (dark scanner viewport with green corner brackets + animated scan line, "Simulate Scan & Check In", manual-entry link) and **Confirm Arrival** (clinic card, "location confirmed" note, big "I've Arrived — Check Me In"). Either path → Queue Tracking. Both check-in directions are designed so you can choose; pick one for production.
- **Reschedule** (15) — from an appointment's Reschedule button: amber "current appointment" banner, new-date chips, the reused booking slot-picker (available/booked/break/selected), sticky Confirm Reschedule → **Reschedule success** (struck-through old time → new time, My Appointments / Home).
- **UI States sheet** (16) — compact reference of the common mobile states: loading skeleton (shimmer), no-results empty, no-appointments empty, queue-closed, left-the-queue, and network error+retry. Use these patterns wherever a list/queue/network view can be empty, loading, or failed.

## Views — Clinic Web Dashboard (~1440 wide)
Fixed 244px left sidebar (logo, clinic name, nav with active = blue tint + blue text, app promo card). Functional views: **Dashboard**, **Appointments**, **Queue Management**, **Schedule**.

- **Dashboard** — header (title + date/time-Live + notifications + admin), Export / New Appointment, 5 KPI stat cards, two-column Live Queue Overview (conic donut) + Today's Appointments, three-column Doctor Schedule / Today's Overview (sparkline mini-cards) / Recent Activity.
- **Appointments** — filters (date / doctor / status) + New Appointment; table: Time, Patient (avatar), Doctor, Type, Status badge, actions.
- **Queue Management** — 4 KPI cards, left live-queue table (rank chip, patient, queue time, type, status, current row highlighted green) + right patient detail panel with Quick Actions (Call Next / Mark Arrived / Move to Top / Remove) and drag-reorder hint.
- **Table states (Appointments & Queue)** — each table has a header **Preview** toggle (Default / Loading / Empty): Loading swaps the rows for shimmer skeletons matching the column grid; Empty shows a centered illustration + copy ("No appointments for this day" → New Appointment; "Queue is empty" for the queue). The toggle is a review affordance — drop it in production and drive these from real fetch state.
- **Schedule** — week grid: time rows × 7 day columns, cells colored Available / Booked / Break per the legend.

### Clinic staff auth (web) — NEW
Card-centered on the light app background with a faint blue→green radial accent; reuses the clinic logo + royal-blue primary. The dashboard now sits behind an auth gate (`screen: login | forgot | reset | app`); a **Sign out** button in the sidebar footer returns to login.
- **Login** — "Sign in to your clinic": work email + password (show toggle), keep-signed-in, Forgot-password link, Sign In; "Contact sales" footer.
- **Forgot password** — back-to-sign-in, mail icon, email field, Send reset link, spam/admin note.
- **Reset password** — new + confirm password with a live 3-item rule checklist (met = green check, pending = grey), Reset password.

### Staff dialogs (modals over the dashboard) — NEW
Both are centered modals on a `rgba(15,23,42,.45)` scrim, white 20px-radius card, sticky header/footer, body scrolls.
- **New Appointment** (620px) — opened by either New Appointment button (dashboard header or Appointments page). Patient search → selected-patient chip (with "Add new patient" → Add Patient modal), Doctor + Type selects, date chips, **available-slot grid reusing the patient booking slot pattern** (tap to select; unavailable = greyed/not-allowed; selected = filled blue), optional notes; sticky footer shows the live selected slot + Confirm Booking → in-modal **success state** (green check, SMS-sent copy, Done / Book Another).
- **Add Patient** (480px) — opened by the Appointments-page "Add Patient" button or from inside New Appointment. Full name (**valid** state: green border + check), mobile +60 (**error** state: red border + "Enter a valid Malaysian mobile number"), DOB, gender segmented control, optional email; primary Save Patient is **disabled** until valid. Demonstrates the input valid/error/disabled patterns.

## Views — Platform Operator Console (~1440 wide) — NEW
The **platform operator's** area (the vendor running CareFlow as multi-tenant SaaS). It is deliberately **visually distinct from the clinic portal**: a deep-navy/indigo sidebar with a "PLATFORM" badge and a global (not clinic-scoped) header showing a Production environment pill and operator identity. Built in `CareFlow Platform Admin.dc.html`. Use the navy/indigo platform tokens in `careflow-tokens.ts` (`platformNavy`, `indigo600`, `navActiveBg`, etc.) for this area — keep the blue primary only for in-content actions.

A **Preview** control in the header (Default / Loading / Empty / Error) flips the current data view between its states — it's a review affordance, not production UI; drop it when implementing.

- **Platform Login** — distinct from clinic/patient sign-in: full navy split-screen, left brand panel ("Platform Console", network stats), right email/password card with "authorized operators only" + "logged and audited" notice.
- **Shell** — navy sidebar: Overview, Clinics, Doctors, Patients, divider, Onboard Clinic, Settings; operator profile footer. Active item = indigo tint bg + left indigo bar + white text.
- **Platform Overview** — 6 aggregate KPI cards (total clinics, doctors, patients, appointments today, active queues, no-show rate), platform-wide appointments area chart, "Clinics Needing Attention" strip, recent platform activity feed (with View Audit Log).
- **Clinics** — searchable/filterable table (clinic, doctors, patients, status active/suspended, joined) → row click opens **Clinic Detail** (breadcrumb, identity + status, today's stat cards, doctors list, clinic admins; read-mostly with View-as-Clinic / Suspend actions).
- **Doctors** — platform-wide directory table (doctor, clinic, specialization, status, rating) with clinic/specialization/status filters.
- **Patients** — PII-sensitive: amber "access is logged & audited" banner, prominent search-first input (masked phone numbers), results table (patient, phone, # appointments, # clinics). Designed to discourage open browsing.
- **Onboard New Clinic** — 3-step provisioning flow with a progress stepper: ① Clinic Details (name, address, state, type, contact, hours) → ② First Clinic Admin (name, role, email, mobile, send-invite) → ③ Review & Confirm → success state (clinic active, admin invited).
- **Settings** — operator profile + security/audit panel (2FA, audit logging, session timeout).
- **States** — every data view has default / loading (skeleton) / empty / error designs, reachable via the header Preview control.

## Interactions & Behavior
- **Navigation:** both prototypes use simple state routers. Mobile = stacked flow + bottom tabs (map to React Navigation: a stack for Splash/Login/OTP/Details/Booking flows, a bottom-tab navigator for Home/Appointments/Queue/Profile, Check-In as a center action). Dashboard = sidebar-switched views.
- **State to model:** active screen/view; bottom-tab selection; selected time slot (Doctor Schedule); appointments sub-tab (Upcoming/Completed/Cancelled); selected queue patient (dashboard); OTP digits + countdown; live queue position/ETA.
- **Tap targets** ≥ 44px. Buttons darken / scale ~0.99 on press. Cards are tappable to detail.
- **Transitions:** standard push/pop on stack; tab switches are instant. (Prototype entrance fade was removed for capture stability — add subtle native transitions as desired.)
- **Realtime:** queue position, "people ahead", ETA, and the dashboard live queue are meant to update over a socket/poll; the prototypes show static representative data.
- **Empty / loading / error states:** empty states shown for Completed/Cancelled appointment tabs; add loading skeletons for network views and inline validation on the phone/OTP inputs.

## Assets
- `assets/careflow-logo.png` — horizontal wordmark (transparent PNG).
- `assets/careflow-mark.png` — stacked logo mark used on splash/login (transparent PNG).
- All clinic photos, doctor headshots, maps, and illustrations are **striped placeholders with monospace labels** — replace with production imagery. Icons are inline stroke SVGs in a Lucide-like style; use `lucide-react-native` (or your icon set) to match.

## Files
- `CareFlow Patient App.standalone.html` — offline patient-app prototype (open in a browser).
- `CareFlow Clinic Dashboard.standalone.html` — offline clinic-dashboard prototype.
- `CareFlow Platform Admin.standalone.html` — offline platform-operator console prototype.
- `CareFlow Design System.standalone.html` — visual token reference.
- `source/*.dc.html` — editable source prototypes.
- `theme/careflow-tokens.ts` — drop-in design tokens for Expo.
- `assets/` — logo PNGs.

> Tip for Claude Code: start from `theme/careflow-tokens.ts`, wire Plus Jakarta Sans via `expo-font`, build shared primitives (Button, Badge, Card, StatusPill, ScreenHeader, BottomTabBar) from the Components section, then assemble screens in the order listed.
