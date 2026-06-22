import { supabase } from "@/lib/supabase";

export interface DoctorSummary {
  doctorId: string;
  staffId: string;
  fullName: string;
  specialization: string | null;
  consultationDuration: number;
}

export interface ClinicWithDoctors {
  id: string;
  name: string;
  address: string;
  city: string | null;
  phoneNumber: string | null;
  doctors: DoctorSummary[];
}

export async function searchClinics(query?: string): Promise<ClinicWithDoctors[]> {
  let req = supabase
    .from("clinics")
    .select(`
      id, name, address, city, phone_number,
      clinic_staff!inner (
        id,
        full_name,
        is_active,
        doctors (
          id,
          specialization,
          consultation_duration_minutes
        )
      )
    `)
    .eq("is_active", true)
    .eq("clinic_staff.is_active", true);

  if (query?.trim()) {
    req = req.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await req;
  if (error || !data) return [];

  return data.map((clinic) => {
    const staffArr = (clinic.clinic_staff as unknown) as Array<{
      id: string;
      full_name: string;
      doctors: { id: string; specialization: string | null; consultation_duration_minutes: number } | null;
    }>;

    const doctors: DoctorSummary[] = staffArr.flatMap((staff) => {
      if (!staff.doctors) return [];
      const doc = staff.doctors;
      return [{
        doctorId: doc.id,
        staffId: staff.id,
        fullName: staff.full_name,
        specialization: doc.specialization,
        consultationDuration: doc.consultation_duration_minutes,
      }];
    });

    return {
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      city: clinic.city,
      phoneNumber: clinic.phone_number,
      doctors,
    };
  });
}

export async function getDoctorById(doctorId: string) {
  const { data } = await supabase
    .from("doctors")
    .select(`
      id,
      specialization,
      consultation_duration_minutes,
      clinic_staff!inner (
        full_name,
        clinic_id,
        clinics (
          id,
          name,
          address,
          city
        )
      )
    `)
    .eq("id", doctorId)
    .single();

  if (!data) return null;

  const staff = (data.clinic_staff as unknown) as {
    full_name: string;
    clinic_id: string;
    clinics: { id: string; name: string; address: string; city: string | null } | null;
  };

  return {
    doctorId: data.id,
    fullName: staff.full_name,
    specialization: data.specialization,
    consultationDuration: data.consultation_duration_minutes,
    clinicId: staff.clinic_id,
    clinic: staff.clinics,
  };
}
