import { createServerClient } from "@/lib/supabase/server";

export interface ClinicPatient {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  isGuest: boolean;
  appointmentCount: number;
  queueVisitCount: number;
  lastVisit: string | null; // YYYY-MM-DD
}

/**
 * The clinic's patient roster: everyone with an appointment or queue entry at
 * this clinic. Scoped explicitly through those relationships — never by a bare
 * profiles select — so the result is identical whether or not migration
 * 20260902000001 (relationship-scoped profiles RLS) has been applied.
 */
export async function getClinicPatients(clinicId: string): Promise<ClinicPatient[]> {
  const supabase = await createServerClient();

  const [apptRes, queueRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("patient_id, appointment_date")
      .eq("clinic_id", clinicId),
    supabase
      .from("queue_entries")
      .select("patient_id, joined_at, queues!inner(clinic_id)")
      .eq("queues.clinic_id", clinicId),
  ]);

  const stats = new Map<
    string,
    { appointmentCount: number; queueVisitCount: number; lastVisit: string | null }
  >();
  const bump = (patientId: string, kind: "appt" | "queue", date: string | null) => {
    const s = stats.get(patientId) ?? { appointmentCount: 0, queueVisitCount: 0, lastVisit: null };
    if (kind === "appt") s.appointmentCount += 1;
    else s.queueVisitCount += 1;
    if (date && (!s.lastVisit || date > s.lastVisit)) s.lastVisit = date;
    stats.set(patientId, s);
  };

  for (const row of apptRes.data ?? []) {
    bump(row.patient_id as string, "appt", (row.appointment_date as string | null) ?? null);
  }
  for (const row of queueRes.data ?? []) {
    const joined = row.joined_at as string | null;
    bump(row.patient_id as string, "queue", joined ? joined.slice(0, 10) : null);
  }

  const ids = [...stats.keys()];
  if (ids.length === 0) return [];

  // Chunk the .in() filter to keep the query URL bounded on large rosters.
  const profiles: Array<Record<string, unknown>> = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone_number, gender, date_of_birth")
      .in("id", ids.slice(i, i + 200));
    profiles.push(...((data as Array<Record<string, unknown>> | null) ?? []));
  }

  return profiles
    .map((p) => {
      const s = stats.get(p.id as string) ?? {
        appointmentCount: 0,
        queueVisitCount: 0,
        lastVisit: null,
      };
      const phone = (p.phone_number as string | null) ?? null;
      return {
        id: p.id as string,
        fullName: (p.full_name as string | null) ?? "Patient",
        phoneNumber: phone,
        gender: (p.gender as string | null) ?? null,
        dateOfBirth: (p.date_of_birth as string | null) ?? null,
        isGuest: !phone,
        ...s,
      };
    })
    .sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""));
}
