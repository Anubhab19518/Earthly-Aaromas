"use server";

import { cookies } from "next/headers";
import { getAppConfig } from "@/shared/lib/supabase/config";

export async function setActiveBranchCookie(branchId: string) {
  const { isProduction } = getAppConfig();
  const cookieStore = await cookies();
  cookieStore.set("active_branch_id", branchId, {
    path: "/",
    httpOnly: false,
    secure: isProduction,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
