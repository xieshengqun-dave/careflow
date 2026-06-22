"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const router = useRouter();
  const { loadUser, setUser, signOut } = useAuthStore();

  useEffect(() => {
    loadUser();
    const supabase = createBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          setUser(null);
          router.push("/login");
        } else if (event === "SIGNED_IN") {
          await loadUser();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);
}
