# @careflow/database

Supabase client factory, auto-generated database types, and typed query builders for CareFlow. Depends on `@careflow/shared` for domain types.

## What it contains

- **Client factory** (`src/client.ts`) — `createBrowserClient` (singleton, for Next.js/Expo) and `createServerClient` (stateless, for server-side use). Both are typed against `Database`.
- **Generated types** (`src/types/supabase.ts`) — Supabase-generated TypeScript types for all tables, with `Tables<T>`, `TablesInsert<T>`, and `TablesUpdate<T>` helpers. Regenerate with `pnpm db:generate`.
- **Query builders** (`src/queries/`) — Typed async functions wrapping Supabase queries for clinics, appointments, and queues including realtime subscription helpers.

## Importing

```typescript
// Client
import { createBrowserClient, createServerClient } from "@careflow/database/client";

// Types
import type { Tables, TablesInsert } from "@careflow/database";
type AppointmentRow = Tables<"appointments">;
type NewClinic = TablesInsert<"clinics">;

// Query builders
import { searchClinics, getClinicById } from "@careflow/database/queries/clinics";
import { bookAppointment, getAvailableSlots } from "@careflow/database/queries/appointments";
import { joinQueue, subscribeToQueue } from "@careflow/database/queries/queues";

const client = createBrowserClient();

// Search clinics
const { data } = await searchClinics(client, "Klinik", { state: "Selangor", limit: 10 });

// Book an appointment
const { data: appt, error } = await bookAppointment(client, {
  patientId: "uuid",
  doctorId: "uuid",
  clinicId: "uuid",
  timeSlotId: "uuid",
  appointmentDate: "2026-06-18",
  notes: "First visit",
});
```

## Regenerating types

After making schema changes in Supabase, regenerate `src/types/supabase.ts`:

```bash
# From the packages/database directory (requires Supabase CLI and local instance running)
pnpm db:generate

# Or from the monorepo root
pnpm --filter @careflow/database db:generate
```

The generated file is committed to source control so apps can consume types without running the CLI.

## Realtime — subscribeToQueue

`subscribeToQueue` opens a Supabase Realtime channel scoped to a single queue's entries. Use it in a component to re-render whenever the queue changes.

```typescript
import { createBrowserClient } from "@careflow/database/client";
import { subscribeToQueue } from "@careflow/database/queries/queues";

const client = createBrowserClient();

// Subscribe
const channel = subscribeToQueue(client, queueId, (payload) => {
  console.log("Queue changed:", payload);
  // Re-fetch or update local state here
});

// Unsubscribe on cleanup
channel.unsubscribe();
```

The channel is named `queue:<queueId>` and listens for all `INSERT`, `UPDATE`, and `DELETE` events on `queue_entries` filtered by `queue_id`.

## Environment variables

| Variable | Used in |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `createBrowserClient` (Next.js) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `createBrowserClient` (Next.js) |
| `EXPO_PUBLIC_SUPABASE_URL` | `createBrowserClient` (Expo) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `createBrowserClient` (Expo) |

`createServerClient` takes `url` and `key` directly — pass `process.env.SUPABASE_SERVICE_ROLE_KEY` for privileged server operations.
