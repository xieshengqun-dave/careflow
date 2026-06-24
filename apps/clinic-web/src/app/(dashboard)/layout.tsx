import { redirect } from "next/navigation";
import Image from "next/image";
import { Smartphone } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { UserMenu } from "@/components/shared/UserMenu";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { Separator } from "@/components/ui/separator";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 flex flex-col border-r bg-white shrink-0">
        <div className="p-5">
          <Image src="/logo.png" alt="CareFlow" width={140} height={63} priority />
          <p className="text-xs text-muted-foreground mt-0.5">Clinic Portal</p>
        </div>
        <Separator />
        <SidebarNav />

        {/* Promo card */}
        <div className="px-3 pb-3">
          <div className="rounded-xl bg-cf-primary-50 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="h-4 w-4 text-cf-primary-700" />
              <span className="text-sm font-semibold text-slate-900">CareFlow App</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Manage your clinic on the go.</p>
            <button className="text-xs font-semibold text-cf-primary-700 hover:underline">
              Learn More
            </button>
          </div>
        </div>

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
