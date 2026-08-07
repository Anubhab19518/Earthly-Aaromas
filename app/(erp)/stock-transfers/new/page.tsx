import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { StockTransferForm } from "@/modules/inventory/components/stock-transfer-form";

export default async function NewStockTransferPage() {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">New Stock Transfer</h1>
        <p className="text-sm text-zinc-500">Create a draft transfer to move stock between locations.</p>
      </div>
      <StockTransferForm locations={locations || []} />
    </div>
  );
}
