import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { cookies } from "next/headers";
import { getInventoryLedger } from "@/modules/inventory/services/inventory-ledger.actions";
import { InventoryLedgerClient } from "@/modules/inventory/components/inventory-ledger-client";

export default async function InventoryLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: canView } = await supabase.rpc("has_permission", {
    required_permission_code: "inventory.read",
    target_organization_id: membership.organization_id,
  });

  if (!canView) redirect("/dashboard");

  const orgId = membership.organization_id;
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  const resolvedParams = await searchParams;

  const page = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;
  const locationId = activeBranchId || (typeof resolvedParams.location_id === "string" ? resolvedParams.location_id : undefined);
  const ingredientId = typeof resolvedParams.ingredient_id === "string" ? resolvedParams.ingredient_id : undefined;
  const transactionType = typeof resolvedParams.transaction_type === "string" ? resolvedParams.transaction_type : undefined;
  const sortBy = typeof resolvedParams.sort_by === "string" ? resolvedParams.sort_by : undefined;
  const sortOrder = typeof resolvedParams.sort_order === "string" ? (resolvedParams.sort_order as "asc" | "desc") : undefined;
  
  // Fetch ledger data
  const result = await getInventoryLedger(orgId, {
    page,
    pageSize: 20,
    locationId,
    ingredientId,
    transactionType,
    sortBy,
    sortOrder,
  });

  // Fetch filter options
  const [ { data: locations }, { data: ingredients } ] = await Promise.all([
    supabase.from("locations").select("id, name").eq("organization_id", orgId).is("deleted_at", null),
    supabase.from("ingredients").select("id, name").eq("organization_id", orgId).is("deleted_at", null),
  ]);

  return (
    <div className="mx-auto w-full">
      <InventoryLedgerClient 
        initialData={result.data}
        totalCount={result.totalCount}
        totalPages={result.totalPages}
        currentPage={page}
        locations={locations || []}
        ingredients={ingredients || []}
        activeBranchId={activeBranchId}
      />
    </div>
  );
}
