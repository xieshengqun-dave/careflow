import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getClinicPatients } from "@/lib/queries/patients";
import { PatientsView } from "@/components/patients/PatientsView";

export default async function PatientsPage() {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) redirect("/unauthorized");

  const patients = await getClinicPatients(user.clinicId ?? "");

  return <PatientsView patients={patients} />;
}
