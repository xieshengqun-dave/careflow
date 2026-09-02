import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { registerForPushNotificationsAsync } from "@/lib/api/devices";

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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { set({ user: null, isLoading: false }); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone_number")
        .eq("id", session.user.id)
        .maybeSingle();

      // A null fullName means onboarding hasn't captured a name yet — the
      // root layout routes these users to /onboarding. The phone-OTP trigger
      // creates the profile row with an empty name on first sign-in.
      const fullName = profile?.full_name?.trim() ? profile.full_name.trim() : null;

      set({
        user: {
          id: session.user.id,
          phone: profile?.phone_number ?? session.user.phone ?? null,
          fullName,
        },
        isLoading: false,
      });

      // Fire-and-forget: never block auth/navigation on push registration.
      void registerForPushNotificationsAsync();
    } catch {
      // Network error or misconfigured Supabase — fail open so the splash
      // screen doesn't hang forever; treat as unauthenticated.
      set({ user: null, isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));
