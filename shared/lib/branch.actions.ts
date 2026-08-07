"use server";

import { cookies } from "next/headers";

export async function setActiveBranchCookie(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_branch_id", branchId, {
    path: "/",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
