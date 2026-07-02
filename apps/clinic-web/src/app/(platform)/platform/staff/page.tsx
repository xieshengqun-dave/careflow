import { ShieldCheck, Mail } from "lucide-react";
import { getPlatformAdmins } from "@/lib/queries/platform";

export default async function PlatformStaffPage() {
  const admins = await getPlatformAdmins();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Staff</h1>
        <p className="text-muted-foreground text-sm mt-1">
          CareFlow platform administrators — {admins.length} account{admins.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-white rounded-[18px] border shadow-sm overflow-hidden">
        {admins.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ShieldCheck className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">No platform admins found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                <th className="px-5 py-3 font-semibold uppercase tracking-wide">Account</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wide">Role</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.userId} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4 text-red-500" />
                      </div>
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="h-3.5 w-3.5 text-slate-300" />
                        {admin.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-xs font-semibold">
                      Super Admin
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
