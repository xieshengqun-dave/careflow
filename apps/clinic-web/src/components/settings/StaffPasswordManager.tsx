"use client";

import { useState, useTransition } from "react";
import { KeyRound, ShieldCheck, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { setStaffPassword, setStaffRole } from "@/lib/actions/settings";

const DB_ROLE_LABEL: Record<string, string> = {
  DOCTOR: "Doctor",
  RECEPTIONIST: "Receptionist",
  CLINIC_ADMIN: "Clinic Admin",
  SUPER_ADMIN: "Super Admin",
};

const ASSIGNABLE_ROLES = [
  { value: "DOCTOR",       label: "Doctor" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "CLINIC_ADMIN", label: "Clinic Admin" },
] as const;

interface StaffMember {
  userId: string;
  name: string;
  email: string | null;
  role: string;
  clinicName?: string;
}

function Feedback({ ok, msg }: { ok?: boolean; msg?: string }) {
  if (!msg) return null;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${ok ? "text-green-600" : "text-red-600"}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {msg}
    </span>
  );
}

function StaffRow({ member }: { member: StaffMember }) {
  const [open, setOpen] = useState(false);

  // Role state
  const [selectedRole, setSelectedRole] = useState(member.role);
  const [roleResult, setRoleResult] = useState<{ ok?: boolean; msg?: string } | null>(null);
  const [isRolePending, startRoleTransition] = useTransition();

  // Password state
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwResult, setPwResult] = useState<{ ok?: boolean; msg?: string } | null>(null);
  const [isPwPending, startPwTransition] = useTransition();

  function handleRoleSave() {
    setRoleResult(null);
    startRoleTransition(async () => {
      const res = await setStaffRole(member.userId, selectedRole as "DOCTOR" | "RECEPTIONIST" | "CLINIC_ADMIN");
      if (res.error) {
        setRoleResult({ msg: res.error });
      } else {
        setRoleResult({ ok: true, msg: "Role updated" });
        setTimeout(() => setRoleResult(null), 2500);
      }
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwResult(null);
    if (password !== confirm) { setPwResult({ msg: "Passwords do not match" }); return; }
    startPwTransition(async () => {
      const res = await setStaffPassword(member.userId, password);
      if (res.error) {
        setPwResult({ msg: res.error });
      } else {
        setPwResult({ ok: true, msg: "Password updated" });
        setPassword("");
        setConfirm("");
        setTimeout(() => { setOpen(false); setPwResult(null); }, 2000);
      }
    });
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => { setOpen((o) => !o); setRoleResult(null); setPwResult(null); }}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-cf-primary-100 flex items-center justify-center text-cf-primary-700 font-semibold text-sm shrink-0">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{member.name}</p>
            <p className="text-xs text-slate-400">
              {DB_ROLE_LABEL[member.role] ?? member.role}
              {member.clinicName && <span className="text-slate-300"> · {member.clinicName}</span>}
            </p>
            {member.email && (
              <p className="text-xs text-slate-300 mt-0.5">{member.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t bg-slate-50 divide-y">
          {/* Role section */}
          <div className="px-4 py-3 space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Role
            </p>
            <div className="flex flex-wrap gap-2">
              {ASSIGNABLE_ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRole(r.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    selectedRole === r.value
                      ? "bg-cf-primary-700 text-white border-cf-primary-700"
                      : "bg-white text-slate-600 border-slate-200 hover:border-cf-primary-400"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRoleSave}
                disabled={isRolePending || selectedRole === member.role}
                className="h-8 px-4 text-xs font-semibold rounded-lg bg-cf-primary-700 text-white hover:bg-cf-primary-800 disabled:opacity-40 transition-colors"
              >
                {isRolePending ? "Saving…" : "Save Role"}
              </button>
              <Feedback {...(roleResult ?? {})} />
            </div>
          </div>

          {/* Password section */}
          <form onSubmit={handlePasswordSubmit} className="px-4 py-3 space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Password
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cf-primary-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cf-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPwPending}
                className="h-8 px-4 text-xs font-semibold rounded-lg bg-cf-primary-700 text-white hover:bg-cf-primary-800 disabled:opacity-50 transition-colors"
              >
                {isPwPending ? "Saving…" : "Set Password"}
              </button>
              <Feedback {...(pwResult ?? {})} />
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

interface Props {
  staff: StaffMember[];
}

export function StaffPasswordManager({ staff }: Props) {
  if (staff.length === 0) {
    return <p className="text-sm text-slate-400">No staff accounts found.</p>;
  }

  return (
    <div className="space-y-2">
      {staff.map((m) => (
        <StaffRow key={m.userId} member={m} />
      ))}
    </div>
  );
}
