import { notFound } from "next/navigation";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAllClinics } from "@/lib/queries/platform";
import { getClinicStaff } from "@/lib/actions/settings";
import { StaffPasswordManager } from "@/components/settings/StaffPasswordManager";

export const dynamic = "force-dynamic";

export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  const [clinics, staff] = await Promise.all([
    getAllClinics(),
    getClinicStaff(clinicId),
  ]);

  const clinic = clinics.find((c) => c.id === clinicId);
  if (!clinic) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/platform/clinics"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Clinics
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cf-primary-50 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-cf-primary-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{clinic.name}</h1>
            <p className="text-muted-foreground text-sm">
              {clinic.city}{clinic.state ? `, ${clinic.state}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Doctors",       value: clinic.doctorCount },
          { label: "Appts Today",   value: clinic.appointmentsToday },
          { label: "In Queue Now",  value: clinic.inQueueNow },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-[18px] border shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Staff management */}
      <div className="bg-white rounded-[18px] border shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Staff Accounts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {staff.length} account{staff.length !== 1 ? "s" : ""} · clinic ID: <code className="text-xs bg-slate-100 px-1 rounded">{clinicId.slice(-8)}</code>
          </p>
        </div>
        <StaffPasswordManager staff={staff} />
      </div>
    </div>
  );
}
