# @careflow/ui

Shared UI component library for CareFlow, built on [ShadCN UI](https://ui.shadcn.com/) principles using Tailwind CSS utility classes.

## Overview

This package provides reusable React components and utilities shared across CareFlow applications (e.g., `clinic-web`, `patient-app`). Components are unstyled-first and composed using the `cn` utility, which merges Tailwind classes cleanly.

## Importing

```typescript
// cn utility — use this everywhere you need conditional class merging
import { cn } from "@careflow/ui";

// Status badge components
import { QueueBadge } from "@careflow/ui";
import { AppointmentStatusBadge } from "@careflow/ui";

// Or import directly from the component path
import { QueueBadge } from "@careflow/ui/components/QueueBadge";
```

### Example usage

```tsx
<QueueBadge status="WAITING" />
<QueueBadge status="IN_CONSULTATION" className="ml-2" />

<AppointmentStatusBadge status="CONFIRMED" />
<AppointmentStatusBadge status="NO_SHOW" className="text-sm" />
```

## Adding ShadCN Components

ShadCN components are added per-app and optionally re-exported here for cross-app sharing.

1. In the target app (e.g., `apps/clinic-web`), run:
   ```bash
   npx shadcn@latest add <component>
   # e.g. npx shadcn@latest add button dialog select
   ```
   This drops the component into `apps/clinic-web/src/components/ui/`.

2. If the component needs to be shared across multiple apps, copy or re-export it from this package:
   ```typescript
   // packages/ui/src/components/Button.tsx — re-export from shared location
   export { Button, buttonVariants } from "./button";
   ```
   Then add the export to `src/index.ts`.

3. Update the `exports` field in `package.json` if adding new component paths.

## Peer Dependencies

This package requires **React 19** as a peer dependency. Consuming apps must have React 19 installed:

```json
{
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

Ensure your app's `package.json` has `"react": "^19.0.0"` in its dependencies.

## Development

```bash
# Type-check the package
pnpm --filter @careflow/ui type-check

# Lint
pnpm --filter @careflow/ui lint
```

## Structure

```
packages/ui/
├── src/
│   ├── components/        # Shared React components
│   │   ├── QueueBadge.tsx
│   │   └── AppointmentStatusBadge.tsx
│   ├── lib/
│   │   └── utils.ts       # cn() helper
│   └── index.ts           # Public exports
├── package.json
└── tsconfig.json
```
