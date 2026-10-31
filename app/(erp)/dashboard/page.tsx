import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  getRevenueByPeriod,
  getCustomerRetention,
  getInventoryVsSales,
  getTopMenuItems,
  getWarehouseStockLevels,
} from "@/modules/analytics/services/shop-analytics.actions";
import { getWarehouseIngredients } from "@/modules/analytics/services/warehouse-analytics.actions";
import { ShopDashboard } from "@/modules/analytics/components/shop-dashboard";
import { WarehouseDashboard } from "@/modules/analytics/components/warehouse-dashboard";
import { GenericDashboardClient } from "@/modules/analytics/components/generic-dashboard-client";

export default async function DashboardPage() {
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

  if (!membership) redirect("/onboarding");

  const orgId = membership.organization_id;
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Get active branch details
  const { data: activeBranch } = activeBranchId
    ? await supabase
        .from("locations")
        .select("id, name, location_types(code)")
        .eq("id", activeBranchId)
        .single()
    : { data: null };

  const branchTypeCode = (activeBranch?.location_types as any)?.code || "";
  const isShop = ["SHOP", "KITCHEN", "COUNTER"].includes(branchTypeCode);
  const isWarehouse = branchTypeCode === "WAREHOUSE";
  const locationName = activeBranch?.name || "All Branches";

  // ─── Common: Recent inventory movements ───────────────────────────────────
  let movementsQuery = supabase
    .from("inventory_ledger")
    .select("id, transaction_type, quantity_change, ingredient_id, ingredients(name, units!base_unit_id(symbol)), locations(name), created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (activeBranchId) {
    movementsQuery = movementsQuery.eq("location_id", activeBranchId);
  }

  const { data: rawMovements } = await movementsQuery;

  const recentMovements = (rawMovements || []).map((m: any) => ({
    id: m.id,
    ingredientName: m.ingredients?.name || "Unknown",
    locationName: m.locations?.name || "—",
    date: m.created_at,
    movementType: m.transaction_type,
    quantity: Number(m.quantity_change),
    unit: m.ingredients?.units?.symbol || "",
  }));

  // ─── SHOP DASHBOARD ───────────────────────────────────────────────────────
  if (isShop && activeBranchId) {
    const [
      shopOrdersData,
      revenueData,
      retentionData,
      stockLevels,
      topItemsData,
    ] = await Promise.all([
      supabase
        .from("sales_orders")
        .select("grand_total")
        .eq("organization_id", orgId)
        .eq("location_id", activeBranchId)
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .in("order_status", ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]),
      getRevenueByPeriod(orgId, activeBranchId, "week"),
      getCustomerRetention(orgId, activeBranchId),
      getWarehouseStockLevels(orgId, activeBranchId),
      getTopMenuItems(orgId, activeBranchId, "week"),
    ]);

    const totalOrders = shopOrdersData.data?.length || 0;
    const totalRevenue = shopOrdersData.data?.reduce((s, o) => s + Number(o.grand_total), 0) || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return (
      <ShopDashboard
        orgId={orgId}
        locationId={activeBranchId}
        locationName={locationName}
        totalOrders={totalOrders}
        totalRevenue={totalRevenue}
        averageOrderValue={averageOrderValue}
        recentMovements={recentMovements}
        revenueData={revenueData}
        stockLevels={stockLevels}
        retentionRate={retentionData.retentionRate}
        returningCustomers={retentionData.returningCustomers}
        totalCustomers={retentionData.totalCustomers}
        topItems={topItemsData}
      />
    );
  }

  // ─── WAREHOUSE DASHBOARD ──────────────────────────────────────────────────
  if (isWarehouse && activeBranchId) {
    const [
      { count: inventoryItemsCount },
      { count: pendingPosCount },
      { count: suppliersCount },
      recentGrnsData,
      stockLevels,
      inventoryIngredients,
    ] = await Promise.all([
      supabase.from("inventory_snapshot").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("location_id", activeBranchId),
      supabase.from("purchase_orders").select("*", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["APPROVED", "SENT"]),
      supabase.from("suppliers").select("*", { count: "exact", head: true }).eq("organization_id", orgId).is("deleted_at", null),
      supabase
        .from("goods_receipts")
        .select("id, grn_number, status, received_date, suppliers(name)")
        .eq("organization_id", orgId)
        .eq("warehouse_location_id", activeBranchId)
        .order("created_at", { ascending: false })
        .limit(6),
      getWarehouseStockLevels(orgId, activeBranchId),
      getWarehouseIngredients(orgId, activeBranchId),
    ]);

    const recentGrns = (recentGrnsData.data || []).map((g: any) => ({
      id: g.id,
      grn_number: g.grn_number,
      supplierName: g.suppliers?.name || "—",
      received_date: g.received_date,
      status: g.status,
    }));

    return (
      <WarehouseDashboard
        orgId={orgId}
        locationId={activeBranchId}
        locationName={locationName}
        inventoryItemsCount={inventoryItemsCount || 0}
        pendingPosCount={pendingPosCount || 0}
        suppliersCount={suppliersCount || 0}
        recentMovements={recentMovements}
        recentGrns={recentGrns}
        stockLevels={stockLevels}
        inventoryIngredients={inventoryIngredients}
      />
    );
  }

  // ─── FALLBACK: Generic overview (no branch or unknown type) ───────────────
  const [
    { count: ingredientsCount },
    { count: suppliersCount },
    { count: pendingPosCount },
    { count: inventoryItemsCount },
    { count: grnsCount },
  ] = await Promise.all([
    supabase.from("ingredients").select("*", { count: "exact", head: true }).eq("organization_id", orgId).is("deleted_at", null),
    supabase.from("suppliers").select("*", { count: "exact", head: true }).eq("organization_id", orgId).is("deleted_at", null),
    supabase.from("purchase_orders").select("*", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["APPROVED", "SENT"]),
    supabase.from("inventory_snapshot").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("goods_receipts").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);

  return (
    <GenericDashboardClient
      ingredientsCount={ingredientsCount || 0}
      suppliersCount={suppliersCount || 0}
      pendingPosCount={pendingPosCount || 0}
      inventoryItemsCount={inventoryItemsCount || 0}
      grnsCount={grnsCount || 0}
      recentMovements={recentMovements}
    />
  );
}
