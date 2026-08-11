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
    <section className="w-full max-w-sm flex flex-col items-center bg-transparent p-6">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 text-[#8b5cf6] mb-8">
        <span className="text-xl font-semibold tracking-tight text-slate-800">Earthly Aaromas</span>
      </div>

      <h1 className="text-[22px] font-bold tracking-tight text-slate-900 text-center">Sign In</h1>
      <p className="mt-1.5 text-[13px] font-medium text-slate-500 mb-8 text-center">Enter your email and password to access your workspace</p>
      
      <div className="w-full">
        <LoginForm />
      </div>
    </section>
  );
}
