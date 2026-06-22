import { Ionicons } from "@expo/vector-icons";

// pnpm hoists @types/react@19 from clinic-web into this package's TSC context,
// causing @expo/vector-icons class components to fail JSX type checking due to
// a ReactNode/bigint incompatibility between React 18 and 19 type definitions.
// This wrapper casts around it cleanly in one place.
export const Icon = Ionicons as unknown as React.FC<{
  name: string;
  size?: number;
  color?: string;
  style?: unknown;
}>;

export type IoniconName = string;
