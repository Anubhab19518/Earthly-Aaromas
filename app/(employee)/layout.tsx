import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { EmployeeSidebar } from "@/shared/components/layout/employee-sidebar";

export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/employee-login");

  // Use the security-definer RPC — employees are at aal1, so direct table queries
  // on organization_memberships, organizations, profiles, and roles are all blocked
  // by the has_mfa_assurance() RLS policies added in the TOTP migration.
  const { data: info, error } = await supabase.rpc("get_my_employee_info").single();

  if (error || !info) redirect("/employee-login");

  // Owners must not be in the employee portal
  if (info.role_code === "OWNER") redirect("/dashboard");

  const orgName = info.organization_name ?? "Your Organisation";
  const userFullName = info.full_name ?? "Employee";

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFBFC] font-sans">
      <EmployeeSidebar orgName={orgName} userFullName={userFullName} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
