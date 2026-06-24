# Handoff: CareFlow — Patient App & Clinic Dashboard

## Overview
CareFlow is a **smart queue & appointment management** product for clinics, with two surfaces:

1. **Patient mobile app** (12 screens) — find clinics, book appointments, join walk-in queues, and track queue position in real time.
2. **Clinic web dashboard** (4 primary views) — staff overview, appointment management, live queue management, and doctor schedules.

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

## Views — Clinic Web Dashboard (~1440 wide)
Fixed 244px left sidebar (logo, clinic name, nav with active = blue tint + blue text, app promo card). Functional views: **Dashboard**, **Appointments**, **Queue Management**, **Schedule**.

- **Dashboard** — header (title + date/time-Live + notifications + admin), Export / New Appointment, 5 KPI stat cards, two-column Live Queue Overview (conic donut) + Today's Appointments, three-column Doctor Schedule / Today's Overview (sparkline mini-cards) / Recent Activity.
- **Appointments** — filters (date / doctor / status) + New Appointment; table: Time, Patient (avatar), Doctor, Type, Status badge, actions.
- **Queue Management** — 4 KPI cards, left live-queue table (rank chip, patient, queue time, type, status, current row highlighted green) + right patient detail panel with Quick Actions (Call Next / Mark Arrived / Move to Top / Remove) and drag-reorder hint.
- **Schedule** — week grid: time rows × 7 day columns, cells colored Available / Booked / Break per the legend.

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
- `CareFlow Clinic Dashboard.standalone.html` — offline dashboard prototype.
- `CareFlow Design System.standalone.html` — visual token reference.
- `source/*.dc.html` — editable source prototypes.
- `theme/careflow-tokens.ts` — drop-in design tokens for Expo.
- `assets/` — logo PNGs.

> Tip for Claude Code: start from `theme/careflow-tokens.ts`, wire Plus Jakarta Sans via `expo-font`, build shared primitives (Button, Badge, Card, StatusPill, ScreenHeader, BottomTabBar) from the Components section, then assemble screens in the order listed.
