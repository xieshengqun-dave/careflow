"use client";

import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase/client";
import type { AuthUser } from "@careflow/shared";

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;
  loadUser: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,

  loadUser: async () => {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ user: null, isLoading: false }); return; }

    const { data: staffData } = await supabase
      .from("clinic_staff")
      .select("role, clinic_id")
      .eq("user_id", user.id)
      .single();

    set({
      user: {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: (staffData?.role?.toLowerCase() as any) ?? "receptionist",
        clinicId: staffData?.clinic_id ?? null,
        fullName: user.user_metadata?.full_name ?? user.email ?? "Staff",
      },
      isLoading: false,
    });
  },

  signOut: async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));
