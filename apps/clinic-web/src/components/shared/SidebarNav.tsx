"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ListOrdered,
  Stethoscope,
  CalendarClock,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@careflow/shared";

type NavItem = { href: string; label: string; icon: React.ElementType };

const OPS_ITEMS: NavItem[] = [
  { href: "/queue",        label: "Queue",        icon: ListOrdered },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
];

const DOCTOR_EXTRA: NavItem = { href: "/schedules", label: "My Schedule", icon: CalendarClock };

const MGMT_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctors",   label: "Doctors",   icon: Stethoscope },
  { href: "/schedules", label: "Schedules", icon: CalendarClock },
  { href: "/settings",  label: "Settings",  icon: SettingsIcon },
];

function navItemsForRole(role: UserRole): { ops: NavItem[]; mgmt: NavItem[] } {
  switch (role) {
    case "receptionist":
      return { ops: OPS_ITEMS, mgmt: [] };
    case "doctor":
      return { ops: [...OPS_ITEMS, DOCTOR_EXTRA], mgmt: [] };
    case "clinic_admin":
    case "super_admin":
    default:
      return { ops: OPS_ITEMS, mgmt: MGMT_ITEMS };
  }
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-cf-primary-50 text-cf-primary-700"
          : "text-slate-600 hover:bg-cf-primary-50 hover:text-cf-primary-700",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      {item.label}
    </Link>
  );
}

export function SidebarNav({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname();
  const { ops, mgmt } = navItemsForRole(userRole);

  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {ops.map((item) => (
        <NavLink key={item.href} item={item} active={!!pathname?.startsWith(item.href)} />
      ))}

      {mgmt.length > 0 && (
        <>
          <div className="pt-3 pb-1 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Management
            </p>
          </div>
          {mgmt.map((item) => (
            <NavLink key={item.href} item={item} active={!!pathname?.startsWith(item.href)} />
          ))}
        </>
      )}
    </nav>
  );
}
