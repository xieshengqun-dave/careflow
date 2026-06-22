# CareFlow Environment Variables Reference

Smart Appointment & Queue Management Platform for Malaysian Clinics

---

> **NEVER commit secrets to version control.**
> `.env.local`, `.env.production`, and any file containing real credentials must be listed in `.gitignore`.
> Only `.env.example` files (with placeholder values, no real secrets) may be committed.

---

## Table of Contents

1. [Prefix Rules](#prefix-rules)
2. [Supabase](#supabase)
3. [Firebase](#firebase)
4. [Authentication](#authentication)
5. [SMS / OTP](#sms--otp)
6. [Web — Next.js Only](#web--nextjs-only)
7. [Mobile — Expo Only](#mobile--expo-only)
8. [Feature Flags](#feature-flags)
9. [Local Development Setup](#local-development-setup)
10. [CI/CD and Production](#cicd-and-production)

---

## Prefix Rules

The prefix on an environment variable determines where it can be safely used.

### `NEXT_PUBLIC_` — Next.js (Web)

Variables prefixed with `NEXT_PUBLIC_` are **inlined into the browser bundle at build time**. They are visible to anyone who inspects the JavaScript served to the browser. Only use this prefix for values that are safe to expose publicly (e.g., the Supabase project URL and `anon` key — these are designed to be public and are protected by RLS).

```typescript
// Safe — anon key is public by design
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// NEVER do this — service role key must stay server-only
process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY // WRONG
```

Variables without the `NEXT_PUBLIC_` prefix are only available server-side (Server Components, Server Actions, API Routes, middleware).

### `EXPO_PUBLIC_` — React Native / Expo

Variables prefixed with `EXPO_PUBLIC_` are **bundled into the app binary** and are readable by anyone who reverse-engineers the app. Apply the same rule as `NEXT_PUBLIC_`: only expose values that are safe to be public.

```typescript
// Safe
process.env.EXPO_PUBLIC_SUPABASE_URL

// NEVER do this
process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY // WRONG
```

Variables without the prefix are **not accessible at runtime** in Expo — they are build-time only.

---

## Supabase

Variables needed by both the web app and the mobile app.

| Variable | Required | App | Description | Example |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Web | Supabase project REST/Realtime URL | `https://abcdefghij.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Web | Public anon key — safe for client use, protected by RLS | `eyJhbGciOiJIUzI1NiIsInR5cCI...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Web (server only) | Bypasses RLS — used only in Server Actions and Edge Functions | `eyJhbGciOiJIUzI1NiIsInR5cCI...` |
| `SUPABASE_JWT_SECRET` | Yes | Web (server only) | Used to verify Supabase JWTs in custom middleware | `super-secret-jwt-string` |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Mobile | Same value as web, different prefix | `https://abcdefghij.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Mobile | Same value as web, different prefix | `eyJhbGciOiJIUzI1NiIsInR5cCI...` |

> The `SUPABASE_SERVICE_ROLE_KEY` must **never** be used in a browser context or in mobile app code. It bypasses all RLS policies.

---

## Firebase

Used for push notification delivery via Firebase Cloud Messaging (FCM).

| Variable | Required | App | Description | Example |
|---|---|---|---|---|
| `FIREBASE_PROJECT_ID` | Yes | Web (server) / Edge Fn | Firebase project identifier | `careflow-production` |
| `FIREBASE_CLIENT_EMAIL` | Yes | Web (server) / Edge Fn | Service account email for Firebase Admin SDK | `firebase-adminsdk-xxxx@careflow-production.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Yes | Web (server) / Edge Fn | Service account private key (PEM format, include `\n` newlines) | `-----BEGIN PRIVATE KEY-----\nMIIE...` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Web (browser) | Web app Firebase config — safe to expose | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Web (browser) | Firebase auth domain | `careflow-production.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Web (browser) | FCM sender ID for web push | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Web (browser) | Firebase app identifier | `1:123456789012:web:abcdef123456` |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Yes | Web (browser) | Web push VAPID public key for service worker | `BL7X...` |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Yes | Mobile | Firebase config for Expo | `AIzaSy...` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Mobile | Firebase project ID for Expo | `careflow-production` |
| `EXPO_PUBLIC_FIREBASE_APP_ID_IOS` | Yes | Mobile (iOS) | iOS Firebase app ID | `1:123456789012:ios:abcdef123456` |
| `EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID` | Yes | Mobile (Android) | Android Firebase app ID | `1:123456789012:android:abcdef123456` |

> `FIREBASE_PRIVATE_KEY` is a multi-line PEM string. In `.env` files, replace literal newlines with `\n`. In CI/CD, store as a base64-encoded secret and decode at runtime.

---

## Authentication

Variables controlling session behaviour and security.

| Variable | Required | App | Description | Example |
|---|---|---|---|---|
| `NEXTAUTH_SECRET` | Yes | Web | Secret for signing Next.js session cookies (if using next-auth alongside Supabase Auth) | `openssl rand -base64 32` output |
| `NEXTAUTH_URL` | Yes (prod) | Web | Canonical URL of the web app — used for OAuth callbacks | `https://app.careflow.my` |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | No | Web | Google OAuth client ID (if social login enabled) | `123456789-abcdef.apps.googleusercontent.com` |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` | No | Web | Google OAuth client secret | `GOCSPX-...` |

---

## SMS / OTP

Supabase Auth uses an SMS provider to send OTP codes. Configure the provider in the Supabase dashboard and set these variables in the Supabase project settings (not in `.env` files).

| Variable | Required | Where Set | Description | Example |
|---|---|---|---|---|
| `TWILIO_ACCOUNT_SID` | Yes (if Twilio) | Supabase dashboard | Twilio account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Yes (if Twilio) | Supabase dashboard | Twilio auth token | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_MESSAGE_SERVICE_SID` | Yes (if Twilio) | Supabase dashboard | Twilio messaging service SID | `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `SMS_PROVIDER` | No | Supabase dashboard | SMS provider selection (twilio, messagebird, vonage) | `twilio` |

> These are set in the Supabase dashboard under Authentication → Providers → Phone. Do not add them to the app `.env` files.

---

## Web — Next.js Only

Variables specific to the Next.js web application.

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | Public base URL of the web app | `https://app.careflow.my` |
| `NEXT_PUBLIC_APP_ENV` | Yes | Environment label for conditional logic | `development` / `staging` / `production` |
| `CRON_SECRET` | Yes (prod) | Secret to authenticate cron job requests to `/api/cron/*` routes | `openssl rand -hex 32` output |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis URL for rate limiting | `https://xxxxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis auth token | `AXxx...` |
| `SENTRY_DSN` | No | Sentry error reporting DSN for the web app | `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx` |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token for source map uploads in CI | `sntrys_...` |
| `ANALYZE` | No | Set to `true` to enable Next.js bundle analyzer | `true` |

---

## Mobile — Expo Only

Variables specific to the React Native Expo application.

| Variable | Required | Description | Example |
|---|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | Yes | Environment label | `development` / `staging` / `production` |
| `EXPO_PUBLIC_API_URL` | Yes | Base URL for any direct API calls (if not using Supabase client directly) | `https://api.careflow.my` |
| `EXPO_PUBLIC_SENTRY_DSN` | No | Sentry DSN for mobile crash reporting | `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx` |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Google Maps API key for clinic location map | `AIzaSy...` |
| `EAS_BUILD_PROFILE` | No | EAS build profile (set automatically by EAS) | `production` |
| `EXPO_APPLE_TEAM_ID` | No (EAS) | Apple Developer Team ID for EAS builds | `XXXXXXXXXX` |
| `EXPO_APPLE_APP_STORE_CONNECT_API_KEY_ID` | No (EAS) | App Store Connect API key for submission | `XXXXXXXXXX` |
| `EXPO_APPLE_APP_STORE_CONNECT_API_ISSUER_ID` | No (EAS) | App Store Connect issuer ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

---

## Feature Flags

Feature flags allow gradual rollout and easy rollback without a deployment.

| Variable | Required | App | Description | Default |
|---|---|---|---|---|
| `NEXT_PUBLIC_FF_ONLINE_PAYMENTS` | No | Web | Enable online payment flow (Stripe / FPX) | `false` |
| `NEXT_PUBLIC_FF_VIDEO_CONSULTATION` | No | Web | Enable video consultation feature | `false` |
| `EXPO_PUBLIC_FF_ONLINE_PAYMENTS` | No | Mobile | Same flag for mobile | `false` |
| `EXPO_PUBLIC_FF_SOCIAL_LOGIN` | No | Mobile | Enable Google/Apple social login | `false` |
| `NEXT_PUBLIC_FF_ANALYTICS_DASHBOARD` | No | Web | Enable clinic analytics dashboard | `false` |
| `FF_NOTIFICATION_BATCH_SIZE` | No | Web (server) | Number of notifications to send per FCM batch | `500` |

Flag values are read as strings. Treat any value other than `"true"` as `false`:

```typescript
const isPaymentsEnabled = process.env.NEXT_PUBLIC_FF_ONLINE_PAYMENTS === 'true';
```

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase CLI (`brew install supabase/tap/supabase`)
- Docker (for local Supabase stack)

### Step 1 — Clone and install

```bash
git clone https://github.com/your-org/careflow.git
cd careflow
pnpm install
```

### Step 2 — Start local Supabase

```bash
supabase start
```

This starts a local PostgreSQL instance, PostgREST, Auth server, Realtime server, and Storage server. The CLI will print the local URLs and keys when it finishes:

```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3 — Apply migrations and seed data

```bash
supabase db reset
```

This applies all migrations in `supabase/migrations/` and runs `supabase/seed.sql`.

### Step 4 — Create `.env.local` files

Copy the example files and fill in the values from the `supabase start` output above.

**Web app (`apps/web/.env.local`):**

```bash
cp apps/web/.env.example apps/web/.env.local
```

Then edit `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development

# Firebase — use your real dev Firebase project or a stub for local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Feature flags (enable what you're working on)
NEXT_PUBLIC_FF_ONLINE_PAYMENTS=false
NEXT_PUBLIC_FF_VIDEO_CONSULTATION=false
```

**Mobile app (`apps/mobile/.env.local` / loaded via `app.config.ts`):**

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

Then edit `apps/mobile/.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=http://<your-local-ip>:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>

EXPO_PUBLIC_APP_ENV=development

EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_APP_ID_IOS=
EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID=
```

> Use your machine's LAN IP (e.g., `192.168.1.5`) instead of `localhost` for the Supabase URL in the mobile app — the device/emulator cannot reach the host machine via `localhost`.

### Step 5 — Run the apps

```bash
# Run everything in parallel via Turborepo
pnpm dev

# Or run individually
pnpm --filter web dev        # Next.js on http://localhost:3000
pnpm --filter mobile start   # Expo dev server
```

### Step 6 — Verify setup

1. Open `http://localhost:54323` (Supabase Studio) — you should see the database tables.
2. Open `http://localhost:3000` — the web app should load.
3. Scan the QR code from the Expo dev server with the Expo Go app.

---

## CI/CD and Production

### Environment Variable Storage

| Environment | Web (Vercel) | Mobile (EAS) |
|---|---|---|
| Development | `.env.local` (gitignored) | `.env.local` (gitignored) |
| Staging | Vercel project environment variables | EAS Secret Store |
| Production | Vercel project environment variables | EAS Secret Store |

### Vercel Configuration

Set all variables in **Vercel → Project → Settings → Environment Variables**. Apply variables to the correct environments (Production, Preview, Development). Never use the "All Environments" option for secrets.

### EAS Configuration

Secrets for EAS builds are stored via the EAS CLI:

```bash
eas secret:create --scope project --name FIREBASE_PRIVATE_KEY --value "$(cat firebase-key.json | base64)"
```

### Rotating Secrets

When rotating a secret (e.g., a compromised Supabase service role key):

1. Generate the new secret in the relevant dashboard (Supabase, Firebase, etc.).
2. Update the secret in Vercel and EAS immediately.
3. Trigger a new deployment to pick up the new value.
4. Revoke the old secret.
5. Notify the team via the incident channel.

Never store the old secret anywhere after rotation.
