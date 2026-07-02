import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ROUTE_PERMISSIONS } from "@careflow/shared";
import type { UserRole } from "@careflow/shared";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  if (!user) {
    if (!isAuthRoute) {
      return NextResponse.redirect(
        new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url)
      );
    }
    return response;
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL("/queue", request.url));
  }

  // Platform admins bypass all route permission checks
  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (platformAdmin) {
    // Redirect platform admins away from clinic dashboard to platform console
    if (pathname === "/" || pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/platform/overview", request.url));
    }
    return response;
  }

  const requiredRoles = Object.entries(ROUTE_PERMISSIONS).find(([route]) =>
    pathname.startsWith(route)
  )?.[1] as UserRole[] | undefined;

  if (requiredRoles) {
    const { data: staffData } = await supabase
      .from("clinic_staff")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const userRole = staffData?.role?.toLowerCase() as UserRole | undefined;
    if (!userRole || !requiredRoles.includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
