# @careflow/shared

Shared types, utilities, and constants used across CareFlow apps. Zero framework dependencies — works identically in Next.js and Expo.

## What it contains

- **Types** (`src/types/`) — TypeScript interfaces and union types for all core domain models: `Profile`, `Clinic`, `Doctor`, `TimeSlot`, `Appointment`, `Queue`, `QueueEntry`, and all associated status/enum types.
- **Constants** (`src/constants/`) — Queue priority levels, status labels, default consultation duration, and the Malaysia timezone string.
- **Utils** (`src/utils/`) — Date/time helpers scoped to Malaysia Time (MYT) and Zod validation schemas for phone numbers, OTPs, and clinic search.

## Importing

```typescript
// Full package
import { Appointment, QueueEntry, formatMYTDate, MALAYSIA_TIMEZONE } from "@careflow/shared";

// Scoped imports (tree-shakeable)
import type { AppointmentStatus } from "@careflow/shared/types";
import { phoneNumberSchema, otpSchema } from "@careflow/shared/utils";
import { QUEUE_PRIORITY, QUEUE_STATUS_LABEL } from "@careflow/shared/constants";
```

## Key utilities

### Date/time helpers (Malaysia Time)

All date functions operate in `Asia/Kuala_Lumpur` (UTC+8).

```typescript
import {
  toMYT,
  formatMYTDate,
  formatMYTTime,
  getMYTToday,
  estimateWaitMinutes,
  formatWaitTime,
  getRelativeDayLabel,
} from "@careflow/shared/utils";

formatMYTDate(new Date());           // "18 Jun 2026"
formatMYTTime(new Date());           // "10:30 AM"
getMYTToday();                       // "2026-06-18"
estimateWaitMinutes(3, 15);          // 45
formatWaitTime(90);                  // "1h 30m"
getRelativeDayLabel("2026-06-18");   // "Today"
getRelativeDayLabel("2026-06-19");   // "Tomorrow"
getRelativeDayLabel("2026-06-25");   // "Thu, 25 Jun"
```

### Phone number validation (Malaysian numbers)

```typescript
import { phoneNumberSchema, otpSchema, clinicSearchSchema } from "@careflow/shared/utils";

phoneNumberSchema.parse("+60123456789");  // valid
phoneNumberSchema.parse("0123456789");    // valid
phoneNumberSchema.parse("123");           // throws ZodError

otpSchema.parse("123456");  // valid
otpSchema.parse("12345");   // throws ZodError — must be 6 digits
```

## Dependencies

| Package | Purpose |
|---|---|
| `zod` | Runtime schema validation |
| `date-fns` | Date formatting and comparison |
| `date-fns-tz` | Timezone-aware date conversion |
