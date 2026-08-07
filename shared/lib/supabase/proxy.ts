import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerConfig } from "@/shared/lib/supabase/config";

export async function updateSession(request: NextRequest) {
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

  await supabase.auth.getClaims();
  return response;
}
