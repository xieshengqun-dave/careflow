"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getMYTToday } from "@careflow/shared";

export interface ClinicDoctor {
  doctorId: string;
  name: string;
  specialization: string | null;
  email: string | null;
}

export interface ClinicPatient {
  userId: string;
  name: string;
  phone: string | null;
  appointmentCount: number;
}

export interface PlatformAdmin {
  userId: string;
  email: string;
}

export interface PlatformOverviewMetrics {
  totalClinics: number;
  totalDoctors: number;
  totalPatients: number;
  appointmentsToday: number;
  activeQueues: number;
}

export interface ClinicSummary {
  id: string;
  name: string;
  city: string;
  state: string;
  isActive: boolean;
  doctorCount: number;
  appointmentsToday: number;
  inQueueNow: number;
  email: string | null;
  phoneNumber: string | null;
}

export async function getPlatformOverview(): Promise<PlatformOverviewMetrics> {
  const supabase = createAdminClient();
  const today = getMYTToday();

  const [clinicsRes, doctorsRes, patientsRes, apptsRes, queuesRes] = await Promise.all([
    supabase.from("clinics").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("doctors").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today),
    supabase.from("queues").select("id", { count: "exact", head: true }).eq("queue_date", today).eq("is_active", true),
  ]);

  return {
    totalClinics: clinicsRes.count ?? 0,
    totalDoctors: doctorsRes.count ?? 0,
    totalPatients: patientsRes.count ?? 0,
    appointmentsToday: apptsRes.count ?? 0,
    activeQueues: queuesRes.count ?? 0,
  };
}

export async function getAllClinics(): Promise<ClinicSummary[]> {
  const supabase = createAdminClient();
  const today = getMYTToday();

  const { data: clinics } = await supabase
    .from("clinics")
    .select("id, name, city, state, is_active, email, phone_number")
    .order("name");

  if (!clinics) return [];

  const results = await Promise.all(
    clinics.map(async (clinic) => {
      const [doctorsRes, apptsRes, queueEntriesRes] = await Promise.all([
        supabase
          .from("clinic_staff")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", clinic.id)
          .eq("role", "DOCTOR")
          .eq("is_active", true),

        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", clinic.id)
          .eq("appointment_date", today),

        supabase
          .from("queue_entries")
          .select("id, queues!inner(clinic_id, queue_date)", { count: "exact", head: true })
          .eq("queues.clinic_id", clinic.id)
          .eq("queues.queue_date", today)
          .in("status", ["WAITING", "CALLED", "IN_CONSULTATION"]),
      ]);

      return {
        id: clinic.id,
        name: clinic.name,
        city: clinic.city ?? "",
        state: clinic.state ?? "",
        isActive: clinic.is_active ?? true,
        email: clinic.email ?? null,
        phoneNumber: clinic.phone_number ?? null,
        doctorCount: doctorsRes.count ?? 0,
        appointmentsToday: apptsRes.count ?? 0,
        inQueueNow: queueEntriesRes.count ?? 0,
      };
    }),
  );

  return results;
}

export async function getClinicDoctors(clinicId: string): Promise<ClinicDoctor[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("doctors")
    .select(`
      id,
      specialization,
      clinic_staff!inner ( full_name, clinic_id, is_active, user_id )
    `)
    .eq("clinic_staff.clinic_id", clinicId)
    .eq("clinic_staff.is_active", true);

  if (!data) return [];

  const results = await Promise.all(
    data.map(async (doc) => {
      const staff = Array.isArray(doc.clinic_staff) ? doc.clinic_staff[0] : doc.clinic_staff;
      const s = staff as unknown as { full_name: string; user_id: string } | null;
      let email: string | null = null;
      if (s?.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(s.user_id);
        email = authUser.user?.email ?? null;
      }
      return {
        doctorId: doc.id,
        name: s?.full_name ?? "Doctor",
        specialization: doc.specialization ?? null,
        email,
      };
    }),
  );

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClinicPatients(clinicId: string): Promise<ClinicPatient[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("appointments")
    .select("patient_id, profiles!inner(full_name, phone_number)")
    .eq("clinic_id", clinicId);

  if (!data) return [];

  // Aggregate by patient
  const map = new Map<string, ClinicPatient>();
  for (const row of data) {
    const pid = row.patient_id as string;
    const profile = row.profiles as unknown as { full_name: string | null; phone_number: string | null } | null;
    if (!map.has(pid)) {
      map.set(pid, {
        userId: pid,
        name: profile?.full_name ?? "Patient",
        phone: profile?.phone_number ?? null,
        appointmentCount: 0,
      });
    }
    map.get(pid)!.appointmentCount += 1;
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPlatformAdmins(): Promise<PlatformAdmin[]> {
  const supabase = createAdminClient();

  const { data: admins } = await supabase.from("platform_admins").select("user_id");
  if (!admins) return [];

  const results = await Promise.all(
    admins.map(async (a) => {
      const { data } = await supabase.auth.admin.getUserById(a.user_id as string);
      return {
        userId: a.user_id as string,
        email: data.user?.email ?? "(no email)",
      };
    }),
  );

  return results;
}
