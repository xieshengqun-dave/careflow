import { Stethoscope, Mail } from "lucide-react";
import { getAllClinics, getClinicDoctors } from "@/lib/queries/platform";
import { ClinicSelector } from "@/components/platform/ClinicSelector";

export default async function PlatformDoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ clinic?: string }>;
}) {
  const { clinic: selectedClinicId } = await searchParams;
  const clinics = await getAllClinics();
  const clinicOptions = clinics.map((c) => ({ id: c.id, name: c.name }));

  const doctors = selectedClinicId ? await getClinicDoctors(selectedClinicId) : [];
  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Doctors</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {selectedClinic ? `${doctors.length} doctor${doctors.length !== 1 ? "s" : ""} at ${selectedClinic.name}` : "Select a clinic to view its doctors"}
          </p>
        </div>
        <ClinicSelector clinics={clinicOptions} selectedId={selectedClinicId ?? null} basePath="/platform/doctors" />
      </div>

      <div className="bg-white rounded-[18px] border shadow-sm overflow-hidden">
        {!selectedClinicId ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Stethoscope className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">Choose a clinic from the dropdown above</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Stethoscope className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">No doctors found for this clinic</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                <th className="px-5 py-3 font-semibold uppercase tracking-wide">Doctor</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wide">Specialization</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wide">Email</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.doctorId} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-cf-primary-100 flex items-center justify-center text-cf-primary-700 font-semibold text-sm shrink-0">
                        {doc.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{doc.specialization ?? "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {doc.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-300" />{doc.email}
                      </span>
                    ) : "—"}
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
