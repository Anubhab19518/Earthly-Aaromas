import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { format } from "date-fns";
import { cookies } from "next/headers";
import { Package, Truck, Store, Layers, ClipboardList, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";

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

  if (!membership) {
    redirect("/onboarding");
  }

  const orgId = membership.organization_id;
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Fetch counts
  const { count: ingredientsCount } = await supabase.from("ingredients").select("*", { count: "exact", head: true }).eq("organization_id", orgId).is("deleted_at", null);
  const { count: suppliersCount } = await supabase.from("suppliers").select("*", { count: "exact", head: true }).eq("organization_id", orgId).is("deleted_at", null);
  const { count: warehousesCount } = await supabase.from("locations").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("type", "WAREHOUSE").is("deleted_at", null);
  
  let grnsQuery = supabase.from("goods_receipts").select("*", { count: "exact", head: true }).eq("organization_id", orgId);
  let inventoryItemsQuery = supabase.from("inventory_snapshot").select("*", { count: "exact", head: true }).eq("organization_id", orgId);
  let recentGrnsQuery = supabase
    .from("goods_receipts")
    .select("id, grn_number, status, received_date, suppliers(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5);
  let recentMovementsQuery = supabase
    .from("inventory_ledger")
    .select("id, movement_type:transaction_type, quantity:quantity_change, ingredients(id, name, units!base_unit_id(symbol)), locations(name), created_at, reference_type, reference_id, ingredient_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (activeBranchId) {
    grnsQuery = grnsQuery.eq("warehouse_location_id", activeBranchId);
    inventoryItemsQuery = inventoryItemsQuery.eq("location_id", activeBranchId);
    recentGrnsQuery = recentGrnsQuery.eq("warehouse_location_id", activeBranchId);
    recentMovementsQuery = recentMovementsQuery.eq("location_id", activeBranchId);
  }

  const [{ count: grnsCount }, { count: inventoryItemsCount }, { data: recentGrns }, { data: recentMovements }] = await Promise.all([
    grnsQuery,
    inventoryItemsQuery,
    recentGrnsQuery,
    recentMovementsQuery,
  ]);

  const grnIds = recentMovements?.filter((m: any) => m.reference_type === "GOODS_RECEIPT" && m.reference_id).map((m: any) => m.reference_id) || [];
  const transferIds = recentMovements?.filter((m: any) => (m.reference_type === "TRANSFER_IN" || m.reference_type === "TRANSFER_OUT") && m.reference_id).map((m: any) => m.reference_id) || [];

  const [ { data: grnItems }, { data: transferItems } ] = await Promise.all([
    grnIds.length > 0 ? supabase.from("goods_receipt_items").select("goods_receipt_id, ingredient_id, received_quantity, units!purchase_unit_id(symbol)").in("goods_receipt_id", grnIds) : Promise.resolve({ data: [] }),
    transferIds.length > 0 ? supabase.from("stock_transfer_items").select("transfer_id, ingredient_id, quantity, units(symbol)").in("transfer_id", transferIds) : Promise.resolve({ data: [] }),
  ]);

  const movementsWithDisplay = recentMovements?.map((mov: any) => {
    let displayQty = Math.abs(mov.quantity);
    let displayUnit = mov.ingredients?.units?.symbol || "";

    if (mov.reference_type === "GOODS_RECEIPT" && grnItems) {
      const item = grnItems.find(i => i.goods_receipt_id === mov.reference_id && i.ingredient_id === mov.ingredient_id);
      if (item) {
        displayQty = Number(item.received_quantity);
        displayUnit = item.units?.symbol || "";
      }
    } else if ((mov.reference_type === "TRANSFER_IN" || mov.reference_type === "TRANSFER_OUT") && transferItems) {
      const item = transferItems.find(i => i.transfer_id === mov.reference_id && i.ingredient_id === mov.ingredient_id);
      if (item) {
        displayQty = Number(item.quantity);
        displayUnit = item.units?.symbol || "";
      }
    }

    return { ...mov, displayQty, displayUnit };
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard Overview</h2>
          <p className="mt-1 text-sm text-zinc-500">Monitor your inventory and supply chain operations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[140px]">
        {/* Bento Grid: Row 1 */}
        <DashboardCard 
          title="Inventory Items" 
          value={inventoryItemsCount || 0} 
          icon={<Package className="h-6 w-6" />} 
          className="col-span-1 md:col-span-2 border-zinc-200 bg-white shadow-md hover:bg-gradient-to-br hover:from-[#4a632a] hover:to-[#3a4f20] hover:border-[#3d5123]"
          titleClass="text-zinc-500 group-hover:text-[#c2dcb0]"
          valueClass="text-zinc-900 text-5xl group-hover:text-white"
          iconClass="text-zinc-600 bg-zinc-100 group-hover:bg-[#3a4f20]/50 group-hover:text-[#eaf1e2]"
          href="/inventory"
        />
        <DashboardCard 
          title="Total GRNs" 
          value={grnsCount || 0} 
          icon={<ClipboardList className="h-6 w-6" />} 
          className="col-span-1 md:col-span-2 bg-[#f4f7f0] border-[#c2dcb0] shadow-sm hover:bg-gradient-to-br hover:from-[#4a632a] hover:to-[#3a4f20] hover:border-[#3d5123]"
          titleClass="text-[#587333] group-hover:text-[#c2dcb0]"
          valueClass="text-[#3a4f20] text-5xl group-hover:text-white"
          iconClass="text-[#587333] bg-[#eaf1e2] group-hover:bg-[#3a4f20]/50 group-hover:text-[#eaf1e2]"
          href="/receiving"
        />

        {/* Bento Grid: Row 2 */}
        <DashboardCard 
          title="Warehouses" 
          value={warehousesCount || 0} 
          icon={<Store className="h-5 w-5" />} 
          className="col-span-1 border-zinc-200 bg-white hover:bg-gradient-to-br hover:from-[#4a632a] hover:to-[#3a4f20] hover:border-[#3d5123]"
          titleClass="text-zinc-500 group-hover:text-[#c2dcb0]"
          valueClass="text-zinc-900 text-3xl group-hover:text-white"
          iconClass="text-zinc-600 bg-zinc-100 group-hover:bg-[#3a4f20]/50 group-hover:text-[#eaf1e2]"
          href="/locations"
        />
        <DashboardCard 
          title="Suppliers" 
          value={suppliersCount || 0} 
          icon={<Truck className="h-5 w-5" />} 
          className="col-span-1 border-zinc-200 bg-white hover:bg-gradient-to-br hover:from-[#4a632a] hover:to-[#3a4f20] hover:border-[#3d5123]"
          titleClass="text-zinc-500 group-hover:text-[#c2dcb0]"
          valueClass="text-zinc-900 text-3xl group-hover:text-white"
          iconClass="text-zinc-600 bg-zinc-100 group-hover:bg-[#3a4f20]/50 group-hover:text-[#eaf1e2]"
          href="/suppliers"
        />
        <DashboardCard 
          title="Total Ingredients" 
          value={ingredientsCount || 0} 
          icon={<Layers className="h-6 w-6" />} 
          className="col-span-1 md:col-span-2 border-zinc-200 bg-white hover:bg-gradient-to-br hover:from-[#4a632a] hover:to-[#3a4f20] hover:border-[#3d5123]"
          titleClass="text-zinc-500 group-hover:text-[#c2dcb0]"
          valueClass="text-zinc-900 text-4xl group-hover:text-white"
          iconClass="text-zinc-600 bg-zinc-100 group-hover:bg-[#3a4f20]/50 group-hover:text-[#eaf1e2]"
          href="/ingredients"
        />

        {/* Bento Grid: Row 3 & 4 (Lists) */}
        <div className="col-span-1 md:col-span-2 row-span-3 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-zinc-100 bg-white/50 px-6 py-5 flex justify-between items-center backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Recent Goods Receipts</h3>
            </div>
            <Link href="/receiving" className="text-xs font-semibold text-[#587333] hover:text-[#3a4f20] transition-colors">View all →</Link>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {recentGrns?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-zinc-400">No goods receipts found.</div>
            ) : (
              <ul className="space-y-1">
                {recentGrns?.map((grn: any) => (
                  <li key={grn.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 rounded-xl transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{grn.grn_number}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{grn.suppliers?.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold tracking-wide uppercase ${grn.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'}`}>
                        {grn.status}
                      </span>
                      <p className="text-[11px] font-medium text-zinc-400">{format(new Date(grn.received_date), "MMM d")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 row-span-3 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-zinc-100 bg-white/50 px-6 py-5 flex justify-between items-center backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Recent Inventory Movements</h3>
            </div>
            <Link href="/inventory/ledger" className="text-xs font-semibold text-[#587333] hover:text-[#3a4f20] transition-colors">View all →</Link>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {recentMovements?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-zinc-400">No inventory movements found.</div>
            ) : (
              <ul className="space-y-1">
                {movementsWithDisplay?.map((mov: any) => (
                  <li key={mov.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 rounded-xl transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{mov.ingredients?.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{mov.locations?.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-sm font-bold flex items-center gap-1 ${
                        mov.quantity > 0 ? "text-emerald-600" : "text-red-500"
                      }`}>
                        {mov.quantity > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {mov.displayQty.toFixed(2)} {mov.displayUnit}
                      </span>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{mov.movement_type.replace("_", " ")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ 
  title, 
  value, 
  icon, 
  className = "", 
  titleClass = "", 
  valueClass = "",
  iconClass = "",
  href = "#"
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  className?: string;
  titleClass?: string;
  valueClass?: string;
  iconClass?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={`group rounded-2xl border p-6 flex flex-col justify-between transition-colors cursor-pointer ${className}`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold uppercase tracking-wider transition-colors ${titleClass}`}>{title}</p>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${iconClass}`}>
          {icon}
        </div>
      </div>
      <p className={`mt-4 font-semibold tracking-tight transition-colors ${valueClass}`}>{value}</p>
    </Link>
  );
}
