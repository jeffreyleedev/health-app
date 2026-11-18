/**
 * Runs before every page request.
 *
 *  1. Refreshes the Supabase session cookies (access tokens expire hourly).
 *  2. Sends signed-out visitors to /sign-in, except on public pages.
 *  3. Sends signed-in users away from /sign-in and /sign-up.
 *
 * This is an optimistic, convenience check. Anything that reads or writes
 * data must verify the user again itself (Next.js docs: Proxy is not a full
 * authorization solution).
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH } from "@/lib/app-info";
import { isPublicPath, isSignedOutOnlyPath } from "@/lib/auth-validation";
import { supabasePublicEnv } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  const { url, publishableKey } = supabasePublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Make refreshed cookies visible to the page rendering this request...
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        // ...and send them back to the browser.
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Stop CDNs caching a response that carries someone's session.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Verifies the token signature and refreshes it if it's about to expire.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!signedIn && !isPublicPath(path)) return redirectKeepingCookies(request, response, "/sign-in");
  if (signedIn && isSignedOutOnlyPath(path)) return redirectKeepingCookies(request, response, HOME_PATH);
  return response;
}

/** A redirect must still carry any refreshed session cookies and cache headers. */
function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string) {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}

export const config = {
  // Skip Next.js internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
