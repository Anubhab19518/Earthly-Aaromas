"use server";

import { createClient } from "@/shared/lib/supabase/server";

export async function getShopAnalytics(organizationId: string, locationId: string) {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfDayStr = today.toISOString();
  
  // 1. Fetch Today's Sales
  const { data: salesToday, error: salesError } = await supabase
    .from("sales_orders")
    .select("grand_total")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .gte("created_at", startOfDayStr)
    .in("order_status", ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]);

  if (salesError) {
    console.error("Error fetching sales today:", salesError);
  }

  const todaysRevenue = salesToday?.reduce((acc, order) => acc + Number(order.grand_total), 0) || 0;
  const ordersTodayCount = salesToday?.length || 0;
  const averageOrderValue = ordersTodayCount > 0 ? todaysRevenue / ordersTodayCount : 0;

  // 2. Fetch current status counts
  const { data: statusCounts } = await supabase
    .from("sales_orders")
    .select("order_status")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .gte("created_at", startOfDayStr);

  const pendingCount = statusCounts?.filter(o => ["DRAFT", "CONFIRMED"].includes(o.order_status)).length || 0;
  const preparingCount = statusCounts?.filter(o => o.order_status === "PREPARING").length || 0;
  const readyCount = statusCounts?.filter(o => o.order_status === "READY").length || 0;
  const completedCount = statusCounts?.filter(o => o.order_status === "COMPLETED").length || 0;

  // 3. Best selling variants today
  const { data: bestVariantsRaw, error: variantsError } = await supabase
    .from("sales_order_items")
    .select("menu_variant_id, quantity, line_total, menu_variants(name, menu_items(name)), sales_orders!inner(organization_id, location_id, created_at, order_status)")
    .eq("sales_orders.organization_id", organizationId)
    .eq("sales_orders.location_id", locationId)
    .gte("sales_orders.created_at", startOfDayStr)
    .in("sales_orders.order_status", ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]);

  if (variantsError) {
    console.error("Error fetching variants:", variantsError);
  }

  const variantMap = new Map();
  bestVariantsRaw?.forEach(item => {
    const id = item.menu_variant_id;
    if (!variantMap.has(id)) {
      const variantData = item.menu_variants as any;
      const itemName = variantData?.menu_items?.name || "";
      const variantName = variantData?.name || "";
      let displayName = itemName;
      if (variantName && variantName.toLowerCase() !== "default") {
        displayName = itemName ? `${itemName} — ${variantName}` : variantName;
      }

      variantMap.set(id, {
        id,
        name: displayName || "Unknown",
        quantity: 0,
        revenue: 0,
      });
    }
    const current = variantMap.get(id);
    current.quantity += item.quantity;
    current.revenue += Number(item.line_total);
  });

  const bestVariants = Array.from(variantMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    todaysRevenue,
    ordersTodayCount,
    averageOrderValue,
    pendingCount,
    preparingCount,
    readyCount,
    completedCount,
    bestVariants,
  };
}
