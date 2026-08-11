import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { format } from "date-fns";

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/employee-login");

  // Use the security-definer RPC to fetch employee data.
  // Employees are at aal1 — organization_memberships, organizations, profiles,
  // and roles tables all require has_mfa_assurance() (aal2) via RLS.
  const { data: rawInfo, error } = await supabase.rpc("get_my_employee_info").single();
  const info = rawInfo as any;

  if (error || !info) redirect("/employee-login");

  const orgName = info.organization_name ?? "Your Organisation";
  const role = info.role_name ?? "Employee";
  const userFullName = info.full_name ?? "Employee";
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <p suppressHydrationWarning className="text-sm font-medium text-zinc-500">{today}</p>
          <h1 suppressHydrationWarning className="mt-1 text-3xl font-bold tracking-tight text-[#172B4D]">
            Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"},{" "}
            {userFullName.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-base text-zinc-500">
            {orgName} · {role}
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl border border-[#b8d89b] bg-sky-50 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-600 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#3a4f20]">Ready to Take Orders</h2>
          <p className="mt-2 text-sky-700">Your station is active and ready to serve customers.</p>

          <a
            href="/employee/pos"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-8 py-3 text-base font-semibold text-white shadow-md hover:bg-sky-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v16m8-8H4" />
            </svg>
            Start Taking Orders
          </a>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoCard
            icon=""
            label="Organisation"
            value={orgName}
          />
          <InfoCard
            icon=""
            label="Your Role"
            value={role}
          />
          <div suppressHydrationWarning>
            <InfoCard
              icon=""
              label="Shift Date"
              value={format(new Date(), "MMM d, yyyy")}
            />
          </div>
        </div>

        {/* Coming Soon Module Teasers */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">
            Coming Soon
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { name: "Take Order", icon: "🛒" },
              { name: "Review Order", icon: "📋" },
              { name: "Generate Bill", icon: "🧾" },
              { name: "Print Bill", icon: "🖨️" },
            ].map((item) => (
              <div
                key={item.name}
                className="flex flex-col items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-center opacity-50 cursor-not-allowed"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-medium text-zinc-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
