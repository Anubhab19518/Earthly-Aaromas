import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { PurchaseOrderForm } from "@/modules/purchasing/components/purchase-order-form";

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const [{ data: suppliers }, { data: locations }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("locations")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">New Purchase Order</h1>
        <p className="text-sm text-zinc-500">Create a draft purchase order to request stock from a supplier.</p>
      </div>
      <PurchaseOrderForm suppliers={suppliers || []} locations={locations || []} />
    </div>
  );
}
