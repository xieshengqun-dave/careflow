import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getClinicStaff } from "@/lib/actions/settings";
import { fetchTreatmentTemplates } from "@/lib/actions/treatments";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { StaffPasswordManager } from "@/components/settings/StaffPasswordManager";
import { TreatmentTemplates } from "@/components/settings/TreatmentTemplates";

export default async function SettingsPage() {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user) redirect("/unauthorized");

  const supabase = await createServerClient();
  const [clinicResult, staff, templates] = await Promise.all([
    user.clinicId
      ? supabase.from("clinics").select("id, name, address, phone_number, email").eq("id", user.clinicId).single()
      : Promise.resolve({ data: null }),
    getClinicStaff(),
    user.clinicId ? fetchTreatmentTemplates(user.clinicId) : Promise.resolve([]),
  ]);
  const clinic = clinicResult.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your clinic information</p>
      </div>

      {clinic ? (
        <SettingsForm clinic={clinic} />
      ) : (
        <p className="text-sm text-slate-400">Clinic settings are managed per-clinic. Log in as clinic staff to edit clinic details.</p>
      )}

      <TreatmentTemplates templates={templates} />

      <div>
        <h2 className="text-lg font-semibold mb-1">Staff Accounts</h2>
        <p className="text-muted-foreground text-sm mb-4">Set or reset passwords for clinic staff</p>
        <StaffPasswordManager staff={staff} />
      </div>
    </div>
  );
}
