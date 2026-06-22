# CareFlow

> Smart Appointment & Queue Management Platform for Malaysian Clinics

CareFlow is a hybrid appointment and real-time queue management platform that empowers patients to book appointments, join walk-in queues remotely, and track their queue position live — while giving clinics powerful tools to manage their daily operations.

---

## Monorepo Structure

```
careflow/
├── apps/
│   ├── clinic-web/          # Next.js 15 — Clinic staff dashboard
│   └── patient-mobile/      # React Native Expo — Patient mobile app
├── packages/
│   ├── ui/                  # Shared UI component library
│   ├── shared/              # Shared types, utilities, constants
│   └── database/            # Supabase client, types & queries
├── supabase/                # Supabase config, migrations, functions
└── docs/                    # Architecture, ERD, setup guides
```

## Quick Start

See [docs/Setup.md](./docs/Setup.md) for the full installation guide.

```bash
# Prerequisites: Node 20+, pnpm 9+, Supabase CLI
pnpm install
cp .env.example .env.local
pnpm dev
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/Architecture.md) | System architecture & tech decisions |
| [ERD](./docs/ERD.md) | Entity relationship diagram |
| [Setup Guide](./docs/Setup.md) | Installation & development setup |
| [Folder Structure](./docs/FolderStructure.md) | Codebase layout reference |
| [Coding Standards](./docs/CodingStandards.md) | Code style & conventions |
| [Environment Variables](./docs/EnvironmentVariables.md) | All env vars documented |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web App | Next.js 15, React 19, TypeScript |
| Mobile App | React Native, Expo SDK 52 |
| Styling | TailwindCSS, ShadCN UI |
| Backend | Supabase (PostgreSQL + Realtime + Auth) |
| Notifications | Firebase Cloud Messaging |
| Monorepo | Turborepo, pnpm workspaces |

## Phase 1 Scope

- Patient mobile app (OTP login, clinic search, booking, queue)
- Clinic web dashboard (queue management, appointments, schedules)
- Real-time queue tracking
- Push notifications

---

*CareFlow — Reducing clinic wait times, one queue at a time.*
