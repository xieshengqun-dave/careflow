import { redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { UserMenu } from "@/components/shared/UserMenu";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/doctors",   label: "Doctors"   },
  { href: "/schedules", label: "Schedules" },
  { href: "/settings",  label: "Settings"  },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-56 flex flex-col border-r bg-white shrink-0">
        <div className="p-5">
          <h1 className="text-xl font-bold text-primary">CareFlow</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Clinic Portal</p>
        </div>
        <Separator />
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-3">
          <UserMenu user={user} />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
