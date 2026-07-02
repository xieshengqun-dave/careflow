"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Stethoscope, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/platform/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/platform/clinics",  label: "Clinics",  icon: Building2 },
  { href: "/platform/doctors",  label: "Doctors",  icon: Stethoscope },
  { href: "/platform/patients", label: "Patients", icon: Users },
  { href: "/platform/staff",    label: "Staff",    icon: ShieldCheck },
];

export function PlatformNav() {
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
