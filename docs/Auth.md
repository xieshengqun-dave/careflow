# Authentication — CareFlow

## Overview

CareFlow uses two separate authentication flows backed by Supabase Auth:

- **Clinic staff** authenticate via email and password through the Next.js web dashboard (`clinic-web`).
- **Patients** authenticate via phone OTP through the React Native mobile app (`patient-mobile`).

Both flows share the same Supabase project. Session handling differs per platform: the web app uses server-side cookies via `@supabase/ssr`; the mobile app uses `expo-secure-store` to persist sessions in the device keychain.

---

## Roles

| Role | App | Auth Method | Description |
|---|---|---|---|
| `patient` | Mobile | Phone OTP | Registered patients booking appointments and joining queues |
| `doctor` | Web | Email + Password | Licensed doctors viewing schedules and managing consultations |
| `receptionist` | Web | Email + Password | Front-desk staff managing walk-ins and check-ins |
| `clinic_admin` | Web | Email + Password | Clinic administrator managing doctors, settings, and reports |
| `super_admin` | Web | Email + Password | Platform-level admin (CareFlow team only) |

---

## Clinic Web Auth Flow

1. Staff visit `/login` and enter their email and password.
2. The login form calls `supabase.auth.signInWithPassword({ email, password })`.
3. On success, Supabase sets an HTTP-only session cookie via `@supabase/ssr`.
4. The Next.js middleware (`src/middleware.ts`) verifies the session cookie on every non-static request. Unauthenticated requests are redirected to `/login?next=<original-path>`.
5. After authentication, staff land on the protected dashboard.

### Forgot Password

1. Staff click "Forgot password" on the login page.
2. The app calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<origin>/reset-password' })`.
3. Supabase sends a reset link to the staff member's email. The link expires after 1 hour.

### Reset Password

1. Staff click the reset link in their email, which lands them on `/reset-password` with a token in the URL hash.
2. The page calls `supabase.auth.updateUser({ password: newPassword })`.
3. On success, the user is redirected to the dashboard.

---

## Patient Mobile Auth Flow

1. **Phone input screen** (`/(auth)/login`): The patient enters their Malaysian mobile number. The number is normalised to E.164 format (see Phone Normalisation below) and `sendOTP` is called.
2. **OTP screen** (`/(auth)/otp`): The patient enters the 6-digit code delivered by SMS. The screen shows a 60-second countdown before allowing a resend. Tapping each digit box auto-advances focus; backspace retreats focus.
3. **OTP verification**: `verifyOTP` calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`. On success, Supabase issues a session and fires `SIGNED_IN` on the auth state listener.
4. **Onboarding** (`/onboarding`): If `profiles.full_name` is empty, the root layout redirects the patient to the onboarding screen to enter their name.
5. **Home tabs** (`/(tabs)`): Once the profile is complete, the patient is routed to the main app.

### Phone Normalisation

Malaysian numbers are normalised to E.164 before being sent to Supabase:

```
011-1234 5678  →  +60111234 5678
0123456789     →  +60123456789
+60123456789   →  +60123456789  (no change — already E.164)
```

Logic: if the number already starts with `+`, leave it unchanged. Otherwise, strip the leading `0` and prepend `+6`.

---

## Session Management

### Web (`clinic-web`)

- Uses `@supabase/ssr` with cookies. The middleware calls `supabase.auth.getUser()` on every request, which silently refreshes expired access tokens using the refresh token stored in the cookie.
- Sessions persist across browser restarts via the long-lived refresh token cookie.
- Signing out calls `supabase.auth.signOut()`, which clears the cookie and redirects to `/login`.

### Mobile (`patient-mobile`)

- Uses `ExpoSecureStoreAdapter` as the Supabase storage adapter. The access token and refresh token are stored in iOS Keychain / Android Keystore, which are encrypted at rest and tied to the app bundle.
- `supabase.auth.onAuthStateChange` is registered in `_layout.tsx`. On `SIGNED_IN` it calls `loadUser()` to populate the Zustand store; on `SIGNED_OUT` it clears the store and redirects to the login screen.
- The Supabase JS client automatically refreshes the access token before expiry using the stored refresh token.

---

## Middleware (clinic-web)

`src/middleware.ts` intercepts every non-static request to the Next.js app.

**Responsibilities:**

1. Reads the session cookie and calls `supabase.auth.getUser()` to validate and refresh the token.
2. If no valid session exists, redirects to `/login?next=<original-path>` so the user can be returned to their destination after login.
3. Performs role-based access control on sensitive route prefixes:
   - Routes under `/doctors/` and `/settings/` require the `clinic_admin` or `super_admin` role.
   - Staff with a lesser role (e.g. `receptionist`) attempting to access these routes receive a 403 or are redirected.

The middleware runs on the Edge runtime and does **not** include static assets (`/_next/`, `/favicon.ico`, etc.) in its matcher.

---

## Route Protection Map

| Route | Allowed Roles |
|---|---|
| `/queue` | `doctor`, `receptionist`, `clinic_admin`, `super_admin` |
| `/appointments` | `doctor`, `receptionist`, `clinic_admin`, `super_admin` |
| `/doctors` | `clinic_admin`, `super_admin` |
| `/settings` | `clinic_admin`, `super_admin` |

---

## Creating Staff Accounts

Staff accounts are **not** self-registered. A `super_admin` or `clinic_admin` provisions them using one of these methods:

- **Supabase Dashboard**: Auth → Users → Invite user. Supabase sends a magic-link invite email.
- **Management API**: `POST /auth/v1/admin/users` with the service role key (server-side only).

After the Supabase Auth user is created, a row must be inserted into `clinic_staff` to assign the role:

```sql
INSERT INTO clinic_staff (clinic_id, user_id, role)
VALUES ('<clinic-uuid>', auth.uid(), 'RECEPTIONIST');
```

Valid role values: `DOCTOR`, `RECEPTIONIST`, `CLINIC_ADMIN`, `SUPER_ADMIN`.

---

## Onboarding Flow

| Actor | Trigger | Destination |
|---|---|---|
| Patient (first login, no profile) | OTP verified, `profiles.full_name` is null | `/onboarding` |
| Patient (profile complete) | Any auth event | `/(tabs)` |
| Staff | Admin-created account, magic link clicked | Dashboard (no onboarding) |

The root layout (`_layout.tsx`) checks `user.profileComplete` (derived from whether `profiles.full_name` is non-empty) on every navigation event and enforces the redirect logic. Staff skip onboarding because their profile row is created by the admin at account provisioning time.

---

## Security Notes

- The Supabase **service role key** is used only in server-side code (Next.js API routes, Edge Functions). It is never included in any client bundle.
- **Row Level Security (RLS)** is enabled on all tables. Even if a JWT is compromised, an attacker can only access rows that the RLS policies allow for that user's `auth.uid()`.
- **OTP expiry**: SMS OTPs expire after 5 minutes (Supabase default). Expired tokens return an error that is surfaced to the patient on the OTP screen.
- **Password reset links** expire after 1 hour.
- **Access tokens** expire after 1 hour. The Supabase client refreshes them automatically in the background using the refresh token. Sessions auto-refresh every hour.
- Phone numbers are stored in E.164 format in Supabase Auth, preventing duplicate accounts from formatting variants of the same number.
