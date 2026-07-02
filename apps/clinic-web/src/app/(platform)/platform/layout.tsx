import { redirect } from "next/navigation";
import Image from "next/image";
import { getServerUser } from "@/lib/auth";
import { PlatformNav } from "@/components/platform/PlatformNav";
import { UserMenu } from "@/components/shared/UserMenu";
import { Separator } from "@/components/ui/separator";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (!user || user.role !== "super_admin") redirect("/unauthorized");

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 flex flex-col border-r bg-white shrink-0">
        <div className="p-5">
          <Image src="/logo.png" alt="CareFlow" width={140} height={63} priority />
          <p className="text-xs text-muted-foreground mt-0.5">Platform Console</p>
        </div>
        <Separator />
        <PlatformNav />
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
