"use client";

import { ShieldOff } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4 max-w-sm">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-cf-red-50 flex items-center justify-center">
            <ShieldOff className="h-7 w-7 text-cf-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-slate-500 text-sm">
          Your account doesn&apos;t have clinic staff access. Sign in with a staff account to continue.
        </p>
        <button
          onClick={handleSignOut}
          className="w-full bg-cf-primary-700 hover:bg-cf-primary-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Sign out and try another account
        </button>
      </div>
    </div>
  );
}
