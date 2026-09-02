export type UserRole =
  | "patient"
  | "doctor"
  | "receptionist"
  | "clinic_admin"
  | "super_admin";

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  clinicId: string | null;
  fullName: string;
}

export const STAFF_ROLE_MAP: Record<string, UserRole> = {
  DOCTOR: "doctor",
  RECEPTIONIST: "receptionist",
  ADMIN: "clinic_admin",
  CLINIC_ADMIN: "clinic_admin",
  SUPER_ADMIN: "super_admin",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  patient: "Patient",
  doctor: "Doctor",
  receptionist: "Receptionist",
  clinic_admin: "Clinic Admin",
  super_admin: "Super Admin",
};

export const CLINIC_ROLES: UserRole[] = [
  "doctor",
  "receptionist",
  "clinic_admin",
  "super_admin",
];

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/dashboard": ["doctor", "receptionist", "clinic_admin", "super_admin"],
  "/doctors":   ["clinic_admin", "super_admin"],
  "/schedules": ["doctor", "clinic_admin", "super_admin"],
  "/settings":  ["clinic_admin", "super_admin"],
  "/queue":     ["doctor", "receptionist", "clinic_admin", "super_admin"],
  "/appointments": ["doctor", "receptionist", "clinic_admin", "super_admin"],
  "/patients":  ["doctor", "receptionist", "clinic_admin", "super_admin"],
};
