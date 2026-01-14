import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Force Node runtime (avoids Edge/cookie limitations)
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/host/events";

  const response = NextResponse.redirect(new URL(next, url.origin));

  try {
    if (!code) {
      // No code provided → just redirect
      return response;
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("next", next);
      loginUrl.searchParams.set("error", "auth_failed");
      loginUrl.searchParams.set("message", error.message);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  } catch (e: any) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "callback_crash");
    loginUrl.searchParams.set("message", e?.message ?? "unknown");
    return NextResponse.redirect(loginUrl);
  }
}
