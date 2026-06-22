# CareFlow Coding Standards

Smart Appointment & Queue Management Platform for Malaysian Clinics

These standards apply to all code in the `apps/` and `packages/` directories. Consistency across the monorepo is more valuable than any individual preference — follow these rules even when you disagree, and open a discussion to change the standard rather than making exceptions.

---

## Table of Contents

1. [TypeScript](#typescript)
2. [Naming Conventions](#naming-conventions)
3. [File Naming](#file-naming)
4. [React](#react)
5. [Next.js (Web App)](#nextjs-web-app)
6. [React Native / Expo (Mobile App)](#react-native--expo-mobile-app)
7. [Database](#database)
8. [Git](#git)
9. [Testing Strategy](#testing-strategy)
10. [Code Review Checklist](#code-review-checklist)

---

## TypeScript

### Strict Mode Always

Every `tsconfig.json` in the monorepo must include:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

These flags are never relaxed on a per-file or per-project basis.

### No `any`

The `any` type defeats the purpose of TypeScript. It is banned.

```typescript
// WRONG
function processResponse(data: any) { ... }

// CORRECT
function processResponse(data: unknown) {
  // Narrow the type before use
  if (!isQueueEntry(data)) throw new Error('Invalid queue entry shape');
  ...
}
```

Use `unknown` for data that arrives from external sources (API responses, Supabase query results before typing, parsed JSON, third-party callbacks). Always narrow `unknown` with a type guard or Zod schema before using it.

The ESLint rule `@typescript-eslint/no-explicit-any` is set to `error`.

### Prefer `interface` for Objects, `type` for Unions

```typescript
// Object shapes → interface
interface QueueEntry {
  id: string;
  queueId: string;
  patientId: string;
  status: QueueEntryStatus;
}

// Unions and computed types → type
type QueueEntryStatus = 'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'SKIPPED' | 'REMOVED';

type QueueEntryWithPatient = QueueEntry & { patient: Profile };
```

Reason: interfaces support declaration merging (useful for augmentation) and produce cleaner error messages.

### Exhaustive Checks

When switching over a union or enum, always include an exhaustive check:

```typescript
function getStatusLabel(status: QueueEntryStatus): string {
  switch (status) {
    case 'WAITING': return 'Waiting';
    case 'CALLED': return 'Called';
    case 'IN_CONSULTATION': return 'In Consultation';
    case 'COMPLETED': return 'Completed';
    case 'SKIPPED': return 'Skipped';
    case 'REMOVED': return 'Removed';
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled status: ${_exhaustive}`);
    }
  }
}
```

### Avoid Type Assertions

Type assertions (`as SomeType`) hide bugs. Prefer type guards.

```typescript
// WRONG
const entry = data as QueueEntry;

// CORRECT — use Zod schema or type guard
const entry = queueEntrySchema.parse(data);
```

The only acceptable use of `as` is `as const` for literal type inference.

---

## Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| React components | PascalCase | `QueueBoard`, `PatientCard` |
| Custom hooks | camelCase prefixed with `use` | `useQueueEntries`, `useNotifications` |
| Regular functions | camelCase | `formatQueueNumber`, `calculateETA` |
| Variables | camelCase | `currentEntry`, `queueDate` |
| Boolean variables | camelCase prefixed with `is`/`has`/`can`/`should` | `isLoading`, `hasError`, `canCheckIn` |
| Constants (module-level, non-primitive) | SCREAMING_SNAKE_CASE | `MAX_QUEUE_SIZE`, `DEFAULT_SLOT_DURATION` |
| Enum values | SCREAMING_SNAKE_CASE | `QueueEntryStatus.WALK_IN` |
| Type aliases | PascalCase | `QueueEntryStatus`, `StaffRole` |
| Interfaces | PascalCase | `QueueEntry`, `ClinicProfile` |
| Database table names | snake_case | `queue_entries`, `clinic_staff` |
| Database column names | snake_case | `created_at`, `patient_id` |
| Environment variables | SCREAMING_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL` |
| CSS / Tailwind classes | kebab-case (Tailwind utilities) | `flex-col`, `text-primary` |

---

## File Naming

All source files use **kebab-case**. No spaces, no underscores, no PascalCase filenames.

### Web App (`apps/web`)

```
components/
  queue-board.tsx           # React component
  queue-board.test.tsx      # Co-located unit test

hooks/
  use-queue-entries.ts      # Custom hook
  use-queue-entries.test.ts

lib/
  supabase-server.ts        # Server-side Supabase client factory
  supabase-browser.ts       # Browser-side Supabase client

app/
  (receptionist)/
    queue/
      page.tsx              # Next.js page (keep name as page.tsx)
      layout.tsx
      loading.tsx
      error.tsx

actions/
  queue-actions.ts          # Server Actions for queue mutations
  appointment-actions.ts
```

### Mobile App (`apps/mobile`)

```
app/
  (tabs)/
    index.tsx               # Home tab
    queue-status.tsx        # Queue status tab

components/
  queue-position-card.tsx
  appointment-list-item.tsx

hooks/
  use-push-notifications.ts
  use-queue-position.ts
```

### Shared Packages

```
packages/types/
  database.ts               # Generated Supabase types (do not hand-edit)
  models.ts                 # Domain interfaces
  enums.ts                  # Shared enum definitions

packages/db/
  queries/
    get-queue-entries.ts
    get-appointments.ts
  mutations/
    join-queue.ts
    update-appointment-status.ts

packages/utils/
  date.ts
  queue.ts
  validation.ts

packages/ui/
  components/
    button.tsx
    card.tsx
    badge.tsx
  theme/
    colors.ts
    spacing.ts
```

---

## React

### Named Exports Only from Component Files

Default exports make refactoring harder (the import alias can diverge from the component name).

```typescript
// WRONG
export default function QueueBoard() { ... }

// CORRECT
export function QueueBoard() { ... }
```

The exception is Next.js pages and layouts, which require default exports per the framework convention (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`).

### Hooks Start with `use`

Every custom hook file and function name starts with `use`. If it does not call any built-in hook internally, it is a util function — put it in `utils/`, not `hooks/`.

### No Prop Drilling Beyond 2 Levels

If a prop needs to travel more than 2 component levels, use one of:

- **React Context** — for tree-wide shared state (e.g., current clinic, authenticated user).
- **Zustand store** — for cross-cutting UI state in the web app (e.g., selected queue, sidebar open state).
- **Jotai atoms** — for fine-grained derived state.

```
// WRONG — drilling clinic through 3 levels
<QueuePage clinic={clinic}>
  <QueueBoard clinic={clinic}>
    <QueueEntry clinic={clinic} />
  </QueueBoard>
</QueuePage>

// CORRECT — provide at top, consume via hook
<ClinicProvider clinic={clinic}>
  <QueuePage />          // doesn't need to pass clinic
</ClinicProvider>

// In QueueEntry:
const { clinic } = useClinic();
```

### Component Responsibilities

- **Server Components** (web): fetch data, compose layout, pass serializable props to Client Components.
- **Client Components** (web/mobile): handle interactions, subscriptions, animations, browser APIs.
- Keep components small. If a component file exceeds ~200 lines, consider splitting it.
- Co-locate the component's test in the same directory.

### Error Boundaries

Every route-level component tree must have an error boundary. In Next.js App Router, use the `error.tsx` file. In React Native, wrap screen content with a custom `<ErrorBoundary>` component from `packages/ui`.

---

## Next.js (Web App)

### Server Components by Default

Every new component is a Server Component unless it explicitly needs browser APIs, event listeners, or React state. Do not add `'use client'` preemptively.

```typescript
// Server Component — fine by default
export async function DoctorProfilePage({ params }: { params: { doctorId: string } }) {
  const doctor = await getDoctorById(params.doctorId); // server-side fetch
  return <DoctorProfile doctor={doctor} />;
}
```

### `use client` Only When Needed

Add `'use client'` to a file only when it uses:
- `useState`, `useEffect`, `useReducer`, or other stateful hooks
- Event handlers (`onClick`, `onChange`, etc.)
- Browser-only APIs (`window`, `localStorage`, `navigator`)
- Supabase Realtime subscriptions

Push the `'use client'` boundary as deep into the component tree as possible to maximize the Server Component surface.

### Server Actions for Mutations

All form submissions and data mutations go through Server Actions. Do not write `POST` API route handlers for mutations that originate from a form.

```typescript
// actions/queue-actions.ts
'use server';

import { createServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function joinWalkInQueue(formData: FormData) {
  const supabase = await createServerClient();
  const queueId = formData.get('queueId') as string;

  const { error } = await supabase
    .from('queue_entries')
    .insert({ queue_id: queueId, type: 'WALK_IN', priority: 3 });

  if (error) throw new Error(error.message);

  revalidatePath('/receptionist/queue');
}
```

### Data Fetching

- Fetch data in the Server Component as close to where it is rendered as possible. Do not fetch everything at the root layout and pass it down.
- Use `React.cache()` to deduplicate identical fetches within the same request.
- For client-side data that changes frequently (queue entries), use the Supabase client library with Realtime subscriptions in a Client Component.

### Route Handlers

Use `app/api/` route handlers only for:
- Webhook receivers (e.g., FCM delivery receipts).
- Endpoints consumed by the mobile app or third-party systems.
- Server-Sent Events or streaming responses.

---

## React Native / Expo (Mobile App)

### StyleSheet API

Use `StyleSheet.create()` rather than inline style objects. Inline objects are recreated on every render.

```typescript
// WRONG
<View style={{ flex: 1, backgroundColor: colors.background }}>

// CORRECT
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
<View style={styles.container}>
```

### Platform-Specific Code

Use `.ios.tsx` / `.android.tsx` file extensions only as a last resort. Prefer `Platform.select()` for small differences and extract into a separate component for large divergences.

### Navigation

All navigation is file-based via Expo Router. Do not use `useNavigation()` to push routes imperatively unless absolutely necessary — use `<Link>` for declarative navigation and `router.push()` only for programmatic navigation (e.g., after a form submission).

### Push Notifications

Always request permission before registering for push tokens. Handle the case where permission is denied gracefully — the app must remain fully functional without push notifications (patients can rely on the in-app Realtime updates).

---

## Database

### snake_case for Everything

All table names, column names, constraint names, index names, and function names in PostgreSQL use snake_case.

### Every Table Has `id` and `created_at`

```sql
CREATE TABLE example (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... columns ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Tables with mutable data also include `updated_at`, maintained by a trigger:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_example_updated_at
BEFORE UPDATE ON example
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### Use RLS, Not Application-Level Auth Checks

Never write code like:

```typescript
// WRONG — application-level auth check
if (user.clinicId !== queueEntry.clinicId) {
  throw new Error('Unauthorized');
}
```

The database RLS policies are the single source of authorization truth. If a user should not see a row, the SELECT query returns no rows. Application code trusts that what Supabase returns is already correctly filtered.

### No Raw SQL in App Code

All database interactions go through the typed query helpers in `packages/db/`. Never write raw SQL strings in `apps/web` or `apps/mobile`. PostgREST methods (`supabase.from(...).select(...)`) are acceptable in `packages/db/` only.

### Migrations

Every schema change is a new migration file in `supabase/migrations/`. File names follow the format:

```
YYYYMMDDHHMMSS_<description>.sql
20240315120000_add_priority_to_queue_entries.sql
```

Migrations are applied forward only. Never edit a migration that has been applied to any environment. Write a new migration to fix a mistake.

---

## Git

### Conventional Commits

All commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type | When to Use |
|---|---|
| `feat` | A new feature visible to the user |
| `fix` | A bug fix |
| `chore` | Maintenance tasks, dependency updates, tooling |
| `docs` | Documentation changes only |
| `refactor` | Code restructuring with no behavior change |
| `test` | Adding or updating tests only |
| `perf` | Performance improvements |
| `ci` | Changes to CI/CD configuration |
| `db` | Database migration files |

**Scopes (examples):**

`web`, `mobile`, `db`, `auth`, `queue`, `appointments`, `notifications`, `ui`, `types`, `utils`

**Examples:**

```
feat(queue): add priority queue support for emergency patients

fix(mobile): prevent duplicate queue join on double-tap

chore(deps): update supabase-js to 2.43.0

db: add index on queue_entries(queue_id, status)

refactor(web): extract QueueBoard into smaller sub-components

test(utils): add unit tests for calculateETA helper
```

### Branch Naming

```
feature/<short-description>
fix/<short-description>
chore/<short-description>
```

Examples:
- `feature/walk-in-queue`
- `fix/duplicate-queue-number`
- `chore/update-supabase-types`

### Pull Requests

- Every PR targets `main`.
- PRs must pass all CI checks (type check, lint, tests) before merging.
- Squash merge is preferred to keep `main` history clean.
- Link the relevant Linear/GitHub issue in the PR description.
- At least one approval required before merging.

---

## Testing Strategy

### Unit Tests — Utils and Hooks

Test pure functions and custom hooks in isolation. These tests are fast and have no external dependencies.

Location: co-located with the source file (`queue.test.ts` next to `queue.ts`).

```typescript
// packages/utils/queue.test.ts
import { calculateETA, formatQueueNumber } from './queue';

describe('formatQueueNumber', () => {
  it('pads single digit numbers to two digits', () => {
    expect(formatQueueNumber(3)).toBe('003');
  });
});

describe('calculateETA', () => {
  it('returns null when there are no entries ahead', () => {
    expect(calculateETA(0, 15)).toBeNull();
  });
});
```

Test framework: **Vitest** (works with Turborepo caching).

### Integration Tests — API Routes and Server Actions

Test that Server Actions and API route handlers behave correctly against a real (local) Supabase instance.

Run against the local Supabase stack (`supabase start`). Use a dedicated test schema or truncate tables in `beforeEach`.

```typescript
// apps/web/actions/queue-actions.test.ts
import { joinWalkInQueue } from './queue-actions';

describe('joinWalkInQueue', () => {
  it('creates a queue_entry with type WALK_IN', async () => {
    const formData = new FormData();
    formData.set('queueId', TEST_QUEUE_ID);
    await joinWalkInQueue(formData);
    // assert via Supabase service role client
  });
});
```

### End-to-End Tests — Critical User Flows

Use **Playwright** for the web app and **Maestro** for the mobile app. Cover the flows that, if broken, would make the product unusable:

**Web (Playwright):**
- Receptionist logs in and views the queue board.
- Receptionist calls next patient and sees the queue advance.
- Receptionist checks in a walk-in patient.

**Mobile (Maestro):**
- Patient signs up with phone number OTP.
- Patient searches for a clinic and joins the walk-in queue.
- Patient views their real-time queue position.
- Patient books an appointment and receives confirmation.

### Test Coverage Goals

| Layer | Minimum Coverage |
|---|---|
| `packages/utils` | 90% |
| `packages/db` (query helpers) | 80% |
| Server Actions | 70% |
| React components | Not measured — test behavior, not implementation |

Coverage is measured by Vitest's built-in reporter. CI fails if coverage drops below thresholds.

---

## Code Review Checklist

Use this list when reviewing a pull request:

- [ ] TypeScript strict mode satisfied — no `any`, no suppressed errors.
- [ ] No prop drilling beyond 2 levels.
- [ ] Server Components used where `'use client'` is not necessary.
- [ ] Mutations go through Server Actions (web) or `packages/db` mutations (mobile).
- [ ] No raw SQL in app code.
- [ ] New database tables have RLS enabled and policies written.
- [ ] New tables/columns have a migration file with correct naming format.
- [ ] All new functions and constants follow naming conventions.
- [ ] Files follow kebab-case naming.
- [ ] Commits follow conventional commits format.
- [ ] Tests added for new utils, hooks, and Server Actions.
- [ ] No secrets, tokens, or `.env` values committed.
- [ ] Shared types placed in `packages/types`, not duplicated in each app.
