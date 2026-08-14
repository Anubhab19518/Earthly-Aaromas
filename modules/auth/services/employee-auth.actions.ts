"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { employeeLoginSchema } from "@/modules/team/schemas/invitation.schema";
import { createClient } from "@/shared/lib/supabase/server";

export type EmployeeSignInState = {
  message: string;
} | null;

export async function employeeSignIn(
  _previousState: EmployeeSignInState,
  formData: FormData,
): Promise<EmployeeSignInState> {
  const parsedInput = employeeLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid sign-in details." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsedInput.data);

  if (error) {
    console.error("Employee Sign-in Error:", error.message, parsedInput.data.email);
    return { message: "Email or password is incorrect. (Make sure you don't copy any spaces!)" };
  }

  // Use the security-definer RPC to check membership — bypasses MFA-gated RLS.
  // Employees are at aal1 and cannot query organization_memberships directly.
  const { data: roleCode } = await supabase.rpc("get_my_role_code");

  if (!roleCode) {
    await supabase.auth.signOut();
    return { message: "Access denied. You do not have an active employee account." };
  }

  // Cache role so proxy can route without DB calls
  const cookieStore = await cookies();
  cookieStore.set("tc_role", roleCode, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(roleCode === "OWNER" ? "/dashboard" : "/employee");
}

