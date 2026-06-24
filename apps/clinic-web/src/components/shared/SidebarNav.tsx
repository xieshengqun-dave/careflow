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

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Dashboard",       icon: LayoutDashboard },
  { href: "/appointments", label: "Appointments",    icon: CalendarDays },
  { href: "/queue",        label: "Queue Management", icon: ListOrdered },
  { href: "/doctors",      label: "Doctors",          icon: Stethoscope },
  { href: "/schedules",    label: "Schedule",         icon: CalendarClock },
  { href: "/settings",     label: "Settings",         icon: SettingsIcon },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
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
      })}
    </nav>
  );
}
