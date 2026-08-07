import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { LoginForm } from "@/modules/auth/components/login-form";
import { createClient } from "@/shared/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  // If already authenticated, route them to the right place based on the cached role cookie
  if (data?.user) {
    const cookieStore = await cookies();
    const roleCode = cookieStore.get("tc_role")?.value;
    if (roleCode === "OWNER") redirect("/dashboard");
    else if (roleCode) redirect("/employee");
    // No tc_role cookie? Let them log in again to restore it
  }

  return (
    <section className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold tracking-wide text-zinc-500">TEA CHAIN ERP</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Owner Portal</h1>
      <p className="mt-2 text-sm text-zinc-600">Sign in to your operations dashboard.</p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </section>
  );
}
