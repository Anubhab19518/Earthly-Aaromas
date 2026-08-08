import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { cookies } from "next/headers";
import { getOwnerOrders } from "@/modules/pos/services/owner-orders.actions";
import { OwnerOrdersClient } from "@/modules/pos/components/owner-orders-client";

export default async function OwnerOrdersPage({
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

  // Owner monitoring needs read permissions to POS
  const { data: canView } = await supabase.rpc("has_permission", {
    required_permission_code: "sales.view",
    target_organization_id: membership.organization_id,
  });

  if (!canView) redirect("/dashboard");

  const orgId = membership.organization_id;
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  const resolvedParams = await searchParams;

  const page = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;
  const locationId = activeBranchId || (typeof resolvedParams.location_id === "string" ? resolvedParams.location_id : undefined);
  const orderNumber = typeof resolvedParams.order_number === "string" ? resolvedParams.order_number : undefined;
  const customerName = typeof resolvedParams.customer_name === "string" ? resolvedParams.customer_name : undefined;
  const customerPhone = typeof resolvedParams.customer_phone === "string" ? resolvedParams.customer_phone : undefined;
  const status = typeof resolvedParams.status === "string" ? resolvedParams.status : undefined;
  
  // Fetch orders
  const result = await getOwnerOrders(orgId, {
    page,
    pageSize: 20,
    locationId,
    orderNumber,
    customerName,
    customerPhone,
    status,
  });

  // Fetch shops for filter options if no branch is selected
  const { data: shops } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", orgId)
    .in("location_type_id", (
      await supabase.from("location_types").select("id").in("code", ["SHOP", "KITCHEN", "COUNTER"])
    ).data?.map(d => d.id) || [])
    .is("deleted_at", null);

  return (
    <div className="mx-auto max-w-7xl">
      <OwnerOrdersClient 
        initialData={result.data}
        totalCount={result.totalCount}
        totalPages={result.totalPages}
        currentPage={page}
        shops={shops || []}
        activeBranchId={activeBranchId}
      />
    </div>
  );
}
