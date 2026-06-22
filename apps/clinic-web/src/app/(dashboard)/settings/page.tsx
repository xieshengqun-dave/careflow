import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user) redirect("/login");

  const supabase = await createServerClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, address, phone_number, email")
    .eq("id", user.clinicId!)
    .single();

  if (!clinic) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">No clinic data found. Check your account setup.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your clinic information</p>
      </div>
      <SettingsForm clinic={clinic} />
    </div>
  );
}
