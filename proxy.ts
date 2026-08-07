import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerConfig } from "@/shared/lib/supabase/config";

const OWNER_ONLY_PREFIXES = [
  "/dashboard",
  "/ingredients",
  "/suppliers",
  "/locations",
  "/receiving",
  "/inventory",
  "/units",
  "/taxes",
  "/team",
];

const EMPLOYEE_ONLY_PREFIXES = ["/employee"];

const PUBLIC_PREFIXES = [
  "/login",
  "/employee-login",
  "/accept-invite",
  "/mfa",
  "/onboarding",
];

function matchesAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const { publishableKey, url } = getSupabaseServerConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh session token (sets updated cookies on response)
  await supabase.auth.getClaims();

  // Public routes and static assets — pass through
  if (
    matchesAny(pathname, PUBLIC_PREFIXES) ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // Root → always send to login (login page handles already-logged-in users)
  if (pathname === "/") {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    response.headers.forEach((value, key) => redirectResponse.headers.append(key, value));
    return redirectResponse;
  }

  // For all protected routes, verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsRoleCheck =
    matchesAny(pathname, OWNER_ONLY_PREFIXES) ||
    matchesAny(pathname, EMPLOYEE_ONLY_PREFIXES);

  if (!needsRoleCheck) return response;

  if (!user) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    response.headers.forEach((value, key) => redirectResponse.headers.append(key, value));
    return redirectResponse;
  }

  // Read the tc_role cookie (set during signIn — no DB call needed here)
  const roleCode = request.cookies.get("tc_role")?.value;
  const isOwner = roleCode === "OWNER";

  if (!roleCode) {
    // Cookie missing: user is authenticated but we don't know their role.
    // Send to login to re-authenticate and re-set the cookie.
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    response.headers.forEach((value, key) => redirectResponse.headers.append(key, value));
    return redirectResponse;
  }

  // Employee accessing owner routes → employee portal
  if (!isOwner && matchesAny(pathname, OWNER_ONLY_PREFIXES)) {
    const redirectResponse = NextResponse.redirect(new URL("/employee", request.url));
    response.headers.forEach((value, key) => redirectResponse.headers.append(key, value));
    return redirectResponse;
  }

  // Owner accessing employee routes → owner dashboard
  if (isOwner && matchesAny(pathname, EMPLOYEE_ONLY_PREFIXES)) {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    response.headers.forEach((value, key) => redirectResponse.headers.append(key, value));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
