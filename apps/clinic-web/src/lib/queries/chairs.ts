import { createServerClient } from "@/lib/supabase/server";

export type ChairStatus = "AVAILABLE" | "OCCUPIED" | "CLEANING" | "RESERVED" | "OUT_OF_SERVICE";

export interface ChairData {
  id: string;
  name: string;
  status: ChairStatus;
  displayOrder: number;
}

export async function getClinicChairs(clinicId: string): Promise<ChairData[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("chairs" as "queues") // cast: not in generated types yet
    .select("id, name, status, display_order")
    .eq("clinic_id" as "id", clinicId)
    .eq("is_active" as "id", true)
    .order("display_order" as "id");

  return ((data as unknown as Array<{
    id: string;
    name: string;
    status: string;
    display_order: number;
  }>) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status as ChairStatus,
    displayOrder: r.display_order,
  }));
}
