import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // 1) Start with a response we can mutate
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2) Create supabase client wired to request/response cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // IMPORTANT: when setting cookies, we must create a new response
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 3) This refreshes the session if needed and makes user available
  const {
    data: { user },
  } = await supabase.auth.getUser();


  // 4) Protect host routes
  if (request.nextUrl.pathname.startsWith("/host") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // 5) Return (possibly updated) response so cookies persist
  return response;
}

export const config = {
  matcher: ["/host/:path*"],
};
