"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { signInSchema } from "@/modules/auth/schemas/auth.schema";
import { createClient } from "@/shared/lib/supabase/server";

export type SignInState = {
  message: string;
} | null;

export async function signIn(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsedInput = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid sign-in details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsedInput.data);

  if (error) {
    return { message: "Email or password is incorrect." };
  }

  // Resolve role immediately after login (auth context is guaranteed here)
  const { data: roleCode } = await supabase.rpc("get_my_role_code");

  // Cache role in a cookie so proxy can route without DB calls
  const cookieStore = await cookies();
  cookieStore.set("tc_role", roleCode ?? "", {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  if (!roleCode) {
    redirect("/onboarding");
  }

  redirect(roleCode === "OWNER" ? "/dashboard" : "/employee");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("tc_role");
  redirect("/login");
}
