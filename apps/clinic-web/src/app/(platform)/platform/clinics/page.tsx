import Link from "next/link";
import { Building2, Phone, Mail, ChevronRight } from "lucide-react";
import { getAllClinics } from "@/lib/queries/platform";

export default async function PlatformClinicsPage() {
  const clinics = await getAllClinics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Clinics</h1>
          <p className="text-muted-foreground text-sm mt-1">{clinics.length} clinic{clinics.length !== 1 ? "s" : ""} on the platform</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clinics.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center">
            <Building2 className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">No clinics found.</p>
          </div>
        ) : clinics.map((clinic) => (
          <div key={clinic.id} className="bg-white rounded-[18px] border shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cf-primary-50 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-cf-primary-700" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm leading-tight">{clinic.name}</p>
                  <p className="text-xs text-slate-400">{clinic.city}{clinic.state ? `, ${clinic.state}` : ""}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                clinic.isActive ? "bg-cf-green-50 text-cf-green-600" : "bg-slate-100 text-slate-500"
              }`}>
                {clinic.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Doctors",    value: clinic.doctorCount },
                { label: "Appts Today", value: clinic.appointmentsToday },
                { label: "In Queue",   value: clinic.inQueueNow },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-lg py-2">
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{label}</p>
                </div>
              ))}
            </div>

            {(clinic.email || clinic.phoneNumber) && (
              <div className="space-y-1">
                {clinic.email && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />{clinic.email}
                  </p>
                )}
                {clinic.phoneNumber && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />{clinic.phoneNumber}
                  </p>
                )}
              </div>
            )}
            <div className="border-t pt-3">
              <Link
                href={`/platform/clinics/${clinic.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-cf-primary-700 hover:text-cf-primary-800"
              >
                Manage Staff <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
