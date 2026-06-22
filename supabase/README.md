# supabase/

Local Supabase configuration, migrations, seed data, and Edge Functions for CareFlow.

For full environment setup, see [docs/Setup.md](../docs/Setup.md).

---

## Local Dev Workflow

### Start the local stack

```bash
supabase start
```

This starts Postgres (port 54322), the API (54321), Studio (54323), Inbucket (54324), and Realtime. On first run it pulls Docker images — subsequent starts are fast.

### Reset the database

Wipes all data, re-runs every migration in order, then applies seed data:

```bash
supabase db reset
```

Use this whenever you want a clean slate or after pulling new migrations from the repo.

### Push schema changes (without reset)

Apply any pending migrations to your local DB without wiping data:

```bash
supabase db push
```

### Seed the database

Run seed data independently (after migrations are already applied):

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/seeds/dev_seed.sql
```

Or, if you have the Supabase CLI configured for seeding:

```bash
supabase db seed
```

---

## Migrations

Migrations live in `supabase/migrations/` and are applied in filename order. The Supabase CLI enforces a timestamp prefix:

```
supabase/migrations/
  20240101000000_create_clinics.sql
  20240101000001_create_profiles.sql
  20240102000000_add_queue_tables.sql
  ...
```

### Creating a new migration

```bash
supabase migration new <description>
# e.g. supabase migration new add_doctor_notes_column
```

This creates a blank timestamped file in `supabase/migrations/`. Write your DDL there, then run `supabase db reset` or `supabase db push` to apply it.

### Rules

- Never edit an existing migration that has been pushed to a shared environment.
- Always create a new migration to alter existing schema.
- Migrations must be idempotent where possible (use `IF NOT EXISTS`, `IF EXISTS`).

---

## Generating TypeScript Types

After any schema change, regenerate the TypeScript types and commit them:

```bash
supabase gen types typescript --local > packages/database/src/types/supabase.ts
```

This produces fully-typed table definitions based on your live local schema. The generated file is imported throughout the apps via `@careflow/database`.

---

## Edge Functions

Edge Functions live in `supabase/functions/`. Each function is a directory containing a `index.ts` entrypoint:

```
supabase/functions/
  notify-patient/
    index.ts
  send-appointment-reminder/
    index.ts
```

### Running locally

```bash
supabase functions serve <function-name>
# e.g. supabase functions serve notify-patient
```

### Deploying to Supabase cloud

```bash
supabase functions deploy <function-name>
# Deploy all functions:
supabase functions deploy
```

Secrets used by Edge Functions are managed separately:

```bash
supabase secrets set MY_SECRET=value
supabase secrets list
```

---

## Seed Data (Dev)

The file `supabase/seeds/dev_seed.sql` inserts the following into your local database:

| Entity | Details |
|---|---|
| Clinics | 2 clinics — CareFlow KL (Jalan Ampang, WP KL) and CareFlow PJ (Damansara Utama, Selangor) |
| Doctors | 3 doctors at the KL clinic: General Practice, Paediatrics, Orthopaedics |
| Schedules | Mon–Fri, 09:00–17:00 (30-min slots) for all 3 doctors |

All IDs are stable UUIDs so re-running the seed is safe (`ON CONFLICT DO NOTHING`).

> **Warning:** This seed file is for local development only. It must never be run against a staging or production database.

---

## Realtime

Supabase Realtime must be **manually enabled per table** in the Supabase Dashboard — it is not controlled by migrations or config.

After deploying to a new Supabase project, go to **Database > Replication** and enable Realtime for:

- `queues`
- `queue_entries`
- `appointments`

Without this, live queue updates and appointment status changes will not propagate to connected clients.

---

## Useful Commands Reference

```bash
supabase status              # Show local service URLs and ports
supabase stop                # Stop all local containers
supabase db diff             # Diff local schema vs. migrations (detect drift)
supabase db lint             # Lint migration SQL for common issues
supabase migration list      # List applied migrations
supabase logs api            # Stream API gateway logs
supabase logs db             # Stream Postgres logs
```
