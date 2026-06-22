import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface PatientUser {
  id: string;
  phone: string | null;
  fullName: string | null;
}

interface AuthStore {
  user: PatientUser | null;
  isLoading: boolean;
  loadUser: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: PatientUser | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,

  loadUser: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { set({ user: null, isLoading: false }); return; }

    let { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone_number")
      .eq("id", session.user.id)
      .single();

    if (!profile) {
      // Auto-create profile for email-based login (trigger only runs for phone OTP)
      const uid = session.user.id.replace(/-/g, "");
      const num = parseInt(uid.slice(0, 8), 16) % 100000000;
      const phone = session.user.phone ?? `+601${num.toString().padStart(8, "0")}`;
      await supabase.from("profiles").upsert(
        { id: session.user.id, full_name: "Test Patient", phone_number: phone },
        { onConflict: "id" }
      );
      const { data: created } = await supabase
        .from("profiles")
        .select("full_name, phone_number")
        .eq("id", session.user.id)
        .single();
      profile = created;
    }

    set({
      user: {
        id: session.user.id,
        phone: profile?.phone_number ?? session.user.phone ?? null,
        fullName: profile?.full_name ?? "Guest",
      },
      isLoading: false,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));
