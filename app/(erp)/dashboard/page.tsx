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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Select a branch to see branch-specific analytics</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { title: "Inventory Items", value: inventoryItemsCount || 0, href: "/inventory" },
          { title: "Total GRNs", value: grnsCount || 0, href: "/receiving" },
          { title: "Pending POs", value: pendingPosCount || 0, href: "/purchase-orders" },
          { title: "Suppliers", value: suppliersCount || 0, href: "/suppliers" },
          { title: "Ingredients", value: ingredientsCount || 0, href: "/ingredients" },
        ].map(card => (
          <Link key={card.title} href={card.href} className="block h-full hover:opacity-90 transition-opacity">
            <div className="rounded-xl border border-slate-100 bg-white p-5 h-full">
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-slate-400">{card.title}</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 leading-none">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden shrink-0 p-2 h-full flex flex-col">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="text-[15px] font-bold text-slate-800">Recent Inventory</span>
          <Link href="/inventory/ledger" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700">
            See all
          </Link>
        </div>
        <div className="flex flex-col gap-1 mt-2 flex-1">
          {recentMovements.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-400">
              No recent inventory movements.
            </div>
          ) : (
            recentMovements.slice(0, 3).map((m, i) => {
              const dateStr = new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const label = {
                "STOCK_IN": "Stock In",
                "STOCK_OUT": "Stock Out",
                "SALE": "Sale",
                "ADJUSTMENT": "Adjustment",
                "TRANSFER": "Transfer",
                "RETURN": "Return"
              }[m.movementType as string] || m.movementType;
              
              return (
                <Link
                  href="/inventory/ledger"
                  key={m.id}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors bg-white hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                      <span className="text-[14px] font-bold text-slate-800 tracking-tight">{m.ingredientName}</span>
                      
                      <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        <span>{dateStr}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                        <span>{m.quantity > 0 ? "+" : ""}{m.quantity.toFixed(1)} {m.unit || ""}</span>
                      </div>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-1 font-medium truncate">
                      {m.locationName} • {label}
                    </p>
                  </div>
                  <div className="shrink-0 self-center">
                    <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
