"use client";

import { useRouter } from "next/navigation";

interface Props {
  clinics: { id: string; name: string }[];
  selectedId: string | null;
  basePath: string; // e.g. "/platform/doctors"
}

export function ClinicSelector({ clinics, selectedId, basePath }: Props) {
  const router = useRouter();

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => router.push(e.target.value ? `${basePath}?clinic=${e.target.value}` : basePath)}
      className="h-9 px-3 pr-8 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cf-primary-500 text-slate-700"
    >
      <option value="">Select a clinic…</option>
      {clinics.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
