import { Users, Phone } from "lucide-react";
import { getAllClinics, getClinicPatients } from "@/lib/queries/platform";
import { ClinicSelector } from "@/components/platform/ClinicSelector";

export default async function PlatformPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ clinic?: string }>;
}) {
  const { clinic: selectedClinicId } = await searchParams;
  const clinics = await getAllClinics();
  const clinicOptions = clinics.map((c) => ({ id: c.id, name: c.name }));

  const patients = selectedClinicId ? await getClinicPatients(selectedClinicId) : [];
  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {selectedClinic ? `${patients.length} patient${patients.length !== 1 ? "s" : ""} at ${selectedClinic.name}` : "Select a clinic to view its patients"}
          </p>
        </div>
        <ClinicSelector clinics={clinicOptions} selectedId={selectedClinicId ?? null} basePath="/platform/patients" />
      </div>

      <div className="bg-white rounded-[18px] border shadow-sm overflow-hidden">
        {!selectedClinicId ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Users className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">Choose a clinic from the dropdown above</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Users className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">No patients found for this clinic</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                <th className="px-5 py-3 font-semibold uppercase tracking-wide">Patient</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wide">Phone</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wide text-center">Appointments</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.userId} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-sm shrink-0">
                        {p.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {p.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-300" />{p.phone}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-cf-primary-50 text-cf-primary-700 text-xs font-semibold">
                      {p.appointmentCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
