# CareFlow – Installation & Development Setup Guide

This guide walks you through setting up the CareFlow monorepo locally. CareFlow is a Smart Appointment & Queue Management Platform for Malaysian Clinics, built as a pnpm + Turborepo monorepo with a Next.js 15 clinic dashboard and a React Native Expo patient app.

---

## Prerequisites

Ensure the following tools are installed before proceeding.

### Node.js 20+

Use [nvm](https://github.com/nvm-sh/nvm) to manage Node versions on macOS:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell config
source ~/.zshrc   # or ~/.bashrc

# Install and use Node 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v   # should print v20.x.x
```

### pnpm 9+

```bash
npm install -g pnpm

# Verify
pnpm -v   # should print 9.x.x
```

### Supabase CLI

```bash
brew install supabase/tap/supabase

# Verify
supabase --version
```

### Expo CLI

```bash
npm install -g expo-cli

# Verify
expo --version
```

### Git

```bash
# macOS ships with Git. To get the latest version via Homebrew:
brew install git

git --version
```

### Recommended VS Code Extensions

Install these from the VS Code Extensions Marketplace or via the CLI:

| Extension | ID |
|---|---|
| ESLint | `dbaeumer.vscode-eslint` |
| Prettier | `esbenp.prettier-vscode` |
| Tailwind CSS IntelliSense | `bradlc.vscode-tailwindcss` |
| TypeScript (built-in) | `ms-vscode.vscode-typescript-next` |
| Supabase | `supabase.supabase-vscode` |
| Expo Tools | `expo.vscode-expo-tools` |

A `.vscode/extensions.json` file in the repo root recommends these automatically when you open the project.

---

## Step 1: Clone & Install

```bash
# Clone the repository
git clone <repo-url>
cd careflow

# Install all workspace dependencies (runs for all apps and packages)
pnpm install
```

> pnpm workspaces will hoist shared dependencies and link internal packages (`@careflow/shared`, `@careflow/database`, `@careflow/ui`) automatically.

---

## Step 2: Environment Setup

Each app requires its own `.env.local` file. A `.env.example` template is provided at the repo root.

```bash
# Web app (clinic dashboard)
cp .env.example apps/clinic-web/.env.local

# Mobile app (patient app)
cp .env.example apps/patient-mobile/.env.local

# Root – used by shared tooling (Supabase CLI, scripts, etc.)
cp .env.example .env.local
```

Open each `.env.local` file and fill in the values from the sections below (Supabase and Firebase). Leave any keys blank until you complete the relevant setup step.

---

## Step 3: Supabase Setup

### 3.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, choose your organisation, and set a project name (e.g. `careflow-dev`).
3. Choose the **Southeast Asia (Singapore)** region for lowest latency from Malaysia.
4. Save your database password somewhere safe.
5. Once the project is provisioned, navigate to **Settings > API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this server-side only)

Paste these values into your `.env.local` files.

### 3.2 Link the CLI to Your Project

```bash
# In the repo root – initialisation is already done, just link
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` is the slug shown in your Supabase project URL: `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>`.

### 3.3 Apply Migrations

```bash
# Push all migration files in supabase/migrations/ to the remote database
supabase db push
```

### 3.4 Seed Development Data

```bash
# Runs the seed files in supabase/seeds/
supabase db seed
```

### 3.5 Enable Realtime

In the Supabase dashboard, go to **Database > Replication** and enable Realtime for the following tables:

- `queues`
- `queue_entries`
- `appointments`

### 3.6 Enable Row Level Security

Confirm RLS is enabled on **all** tables by navigating to **Authentication > Policies** in the dashboard. All tables should show the RLS shield icon as active. Migration files already include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` statements, but verify this after `db push`.

---

## Step 4: Firebase Setup (Push Notifications)

CareFlow uses Firebase Cloud Messaging (FCM) to deliver push notifications to the patient mobile app and web push to the clinic dashboard.

### 4.1 Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g. `careflow-dev`).
2. Disable Google Analytics if not needed for dev.

### 4.2 Add Platform Apps

**Android:**
1. Click **Add app > Android**.
2. Use the package name from `apps/patient-mobile/app.json` (e.g. `com.careflow.patient`).
3. Download `google-services.json` and place it at:
   ```
   apps/patient-mobile/google-services.json
   ```

**iOS:**
1. Click **Add app > iOS**.
2. Use the bundle ID from `apps/patient-mobile/app.json` (e.g. `com.careflow.patient`).
3. Download `GoogleService-Info.plist` and place it at:
   ```
   apps/patient-mobile/GoogleService-Info.plist
   ```

### 4.3 Enable Firebase Cloud Messaging

1. In the Firebase console, go to **Project Settings > Cloud Messaging**.
2. Ensure FCM API (V1) is enabled.
3. Copy the **Server key** → `FIREBASE_SERVER_KEY` in `.env.local`.

### 4.4 Web Push VAPID Key (clinic-web)

1. In **Project Settings > Cloud Messaging > Web Push certificates**, click **Generate key pair**.
2. Copy the VAPID public key → `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in `apps/clinic-web/.env.local`.

### 4.5 Firebase Config Values

From **Project Settings > General > Your apps > SDK setup and configuration**, copy the config object values into both `.env.local` files:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## Step 5: Running the Apps

All scripts are defined in the root `package.json` and executed via Turborepo pipelines.

```bash
# Run all apps and packages in dev mode (recommended)
pnpm dev

# Run only the clinic web dashboard
pnpm dev:web

# Run only the patient mobile app (opens Expo dev server in terminal)
pnpm dev:mobile

# Run the mobile app on an iOS Simulator (requires Xcode)
cd apps/patient-mobile
pnpm ios

# Run the mobile app on an Android Emulator (requires Android Studio)
cd apps/patient-mobile
pnpm android
```

> When running `pnpm dev` from the root, Turborepo starts watchers for all `packages/` first, then the apps. Hot reload is enabled for both Next.js and Expo.

---

## Step 6: Adding ShadCN UI Components (clinic-web)

ShadCN UI is already configured in `apps/clinic-web`. The base setup, `components.json`, and all utility files are committed to the repo. To add a new component:

```bash
cd apps/clinic-web

# Example: add the Button component
npx shadcn@latest add button

# Example: add multiple components
npx shadcn@latest add dialog table badge
```

Components are added to `apps/clinic-web/src/components/ui/`. Do not add ShadCN components to `packages/ui` unless you are explicitly creating cross-platform primitives.

---

## Supabase Local Development

You can run a full local Supabase stack (Postgres, Auth, Storage, Realtime, Edge Functions) via Docker. Ensure Docker Desktop is running first.

```bash
# Start all local Supabase services
supabase start

# Check service status and get local URLs/keys
supabase status

# Stop all local services
supabase stop

# Stop and remove Docker volumes (full reset)
supabase stop --no-backup
```

When using the local stack, update your `.env.local` files with the URLs and keys printed by `supabase status` (they differ from your cloud project credentials).

To create a new migration after changing the local database schema:

```bash
supabase db diff -f your_migration_name
```

This generates a timestamped file in `supabase/migrations/`.

---

## Common Issues & Troubleshooting

### `pnpm install` fails with peer dependency errors

Ensure you are on pnpm 9+ and Node 20+. Delete `node_modules` and the lockfile and retry:

```bash
find . -name "node_modules" -type d -prune -exec rm -rf {} \;
rm pnpm-lock.yaml
pnpm install
```

### Expo `Unable to resolve module` for a package in `packages/`

The internal packages use TypeScript path aliases. Ensure the relevant `package.json` has the correct `main`/`exports` field pointing to the compiled output or the source entry, and that `pnpm install` has been re-run after any package changes.

### Supabase types are out of date

Regenerate the TypeScript types from your remote schema:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > packages/database/src/types/supabase.ts
```

### iOS Simulator not launching

Ensure Xcode and the Xcode Command Line Tools are installed:

```bash
xcode-select --install
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### Android Emulator not detected

Ensure `$ANDROID_HOME` is set and an AVD is running in Android Studio before calling `pnpm android`.

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

Add these lines to your `~/.zshrc` to persist them.

### `supabase db push` fails with auth errors

Re-link the CLI to your project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Next.js build fails with type errors from `packages/`

Run the TypeScript compiler across the whole monorepo to surface all errors at once:

```bash
pnpm typecheck
```

Fix errors in `packages/` first, as apps depend on them.

### Firebase notifications not received on iOS simulator

APNs (Apple Push Notification service) does not work on simulators. Test push notifications on a physical iOS device.
