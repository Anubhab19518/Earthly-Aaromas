import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";

export default async function MfaLayout({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return <main className="grid min-h-screen w-full place-items-center bg-transparent p-6">{children}</main>;
}
