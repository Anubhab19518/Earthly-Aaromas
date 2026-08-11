"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { subDays, startOfDay, startOfWeek, startOfMonth, format, eachDayOfInterval } from "date-fns";

export async function getShopAnalytics(organizationId: string, locationId: string) {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDayStr = today.toISOString();

  const { data: salesToday } = await supabase
    .from("sales_orders")
    .select("grand_total")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .gte("created_at", startOfDayStr)
    .in("order_status", ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]);

  const todaysRevenue = salesToday?.reduce((acc, o) => acc + Number(o.grand_total), 0) || 0;
  const ordersTodayCount = salesToday?.length || 0;
  const averageOrderValue = ordersTodayCount > 0 ? todaysRevenue / ordersTodayCount : 0;

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

  const { data: bestVariantsRaw } = await supabase
    .from("sales_order_items")
    .select("menu_variant_id, quantity, line_total, menu_variants(name, menu_items(name)), sales_orders!inner(organization_id, location_id, created_at, order_status)")
    .eq("sales_orders.organization_id", organizationId)
    .eq("sales_orders.location_id", locationId)
    .gte("sales_orders.created_at", startOfDayStr)
    .in("sales_orders.order_status", ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]);

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
      variantMap.set(id, { id, name: displayName || "Unknown", quantity: 0, revenue: 0 });
    }
    const current = variantMap.get(id);
    current.quantity += item.quantity;
    current.revenue += Number(item.line_total);
  });

  const bestVariants = Array.from(variantMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return { todaysRevenue, ordersTodayCount, averageOrderValue, pendingCount, preparingCount, readyCount, completedCount, bestVariants };
}

// ─── Revenue by period ───────────────────────────────────────────────────────
export async function getRevenueByPeriod(
  organizationId: string,
  locationId: string,
  range: "day" | "week" | "month"
): Promise<{ date: string; actual: number; projected: number }[]> {
  const supabase = await createClient();
  const { startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachHourOfInterval, setHours, format, isAfter } = await import("date-fns");
  const now = new Date();

  let start: Date;
  let end: Date;
  const isDay = range === "day";

  if (isDay) {
    // 9 AM to 9 PM today
    start = setHours(startOfDay(now), 9);
    end = setHours(startOfDay(now), 21);
  } else if (range === "week") {
    start = startOfWeek(now, { weekStartsOn: 1 });
    end = endOfWeek(now, { weekStartsOn: 1 });
  } else {
    start = startOfMonth(now);
    end = endOfMonth(now);
  }

  const { data: orders } = await supabase
    .from("sales_orders")
    .select("grand_total, created_at")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .in("order_status", ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]);

  const intervals = isDay ? eachHourOfInterval({ start, end }) : eachDayOfInterval({ start, end });
  const formatStr = isDay ? "ha" : "MMM d";

  const buckets = new Map<string, number>();
  intervals.forEach(d => buckets.set(format(d, formatStr), 0));

  orders?.forEach(o => {
    const d = new Date(o.created_at);
    if (isDay && (d.getHours() < 9 || d.getHours() > 21)) return;
    const key = format(d, formatStr);
    buckets.set(key, (buckets.get(key) || 0) + Number(o.grand_total));
  });

  const pastIntervals = intervals.filter(d => !isAfter(d, now));
  const totalActual = Array.from(buckets.values()).reduce((sum, val) => sum + val, 0);
  const avgVal = pastIntervals.length > 0 && totalActual > 0 ? totalActual / pastIntervals.length : 150;

  return intervals.map((d, index) => {
    const dateStr = format(d, formatStr);
    const actual = buckets.get(dateStr) || 0;
    const isFuture = isAfter(d, now);
    
    let projected = 0;
    if (isFuture) {
      if (isDay) {
        const h = d.getHours();
        if (h < 12) projected = 200 + (h - 9) * 30; // morning
        else if (h < 17) projected = 300 + (h - 12) * 40; // afternoon
        else projected = 500 + (21 - h) * 50; // evening
      } else if (range === "month") {
        // upward trajectory for month
        const base = avgVal || 150;
        projected = Math.round(base + (index * 5)); 
      } else {
        const variation = 0.8 + ((d.getDate() % 5) * 0.1); 
        projected = Math.round((avgVal || 150) * variation);
      }
    } else {
      projected = actual > 0 ? Math.round(actual * 1.15) : 0;
    }

    return {
      date: dateStr,
      actual: isFuture ? 0 : actual,
      projected,
    };
  });
}

// ─── Customer retention ───────────────────────────────────────────────────────
export async function getCustomerRetention(organizationId: string, locationId: string) {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("sales_orders")
    .select("customer_phone, customer_name")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .not("customer_phone", "is", null)
    .in("order_status", ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]);

  if (!orders || orders.length === 0) {
    return { retentionRate: 0, returningCustomers: 0, totalCustomers: 0 };
  }

  const phoneMap = new Map<string, number>();
  orders.forEach(o => {
    if (o.customer_phone) {
      phoneMap.set(o.customer_phone, (phoneMap.get(o.customer_phone) || 0) + 1);
    }
  });

  const totalCustomers = phoneMap.size;
  const returningCustomers = Array.from(phoneMap.values()).filter(c => c > 1).length;
  const retentionRate = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0;

  return { retentionRate, returningCustomers, totalCustomers };
}

// ─── Inventory value vs sales ─────────────────────────────────────────────────
export async function getInventoryVsSales(organizationId: string, locationId: string) {
  const supabase = await createClient();

  // Inventory items = sum of all item quantities
  const { data: snapshot } = await supabase
    .from("inventory_snapshot")
    .select("quantity_on_hand")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId);

  let inventoryValue = snapshot?.reduce((acc, row) => {
    return acc + Number(row.quantity_on_hand);
  }, 0) || 0;


  // Sales items = total quantity sold
  const { data: sales } = await supabase
    .from("sales_order_items")
    .select("quantity, sales_orders!inner(organization_id, location_id, order_status)")
    .eq("sales_orders.organization_id", organizationId)
    .eq("sales_orders.location_id", locationId)
    .in("sales_orders.order_status", ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]);

  const salesRevenue = sales?.reduce((acc, o) => acc + Number(o.quantity), 0) || 0;

  return { inventoryValue, salesRevenue };
}

// ─── Top menu items by period ─────────────────────────────────────────────────
export async function getTopMenuItems(
  organizationId: string,
  locationId: string,
  range: "day" | "week" | "month"
): Promise<{ name: string; variantName: string; quantity: number; pct: number }[]> {
  const supabase = await createClient();
  const now = new Date();

  let start: Date;
  if (range === "day") start = startOfDay(now);
  else if (range === "week") start = startOfWeek(now, { weekStartsOn: 1 });
  else start = startOfMonth(now);

  const { data: items } = await supabase
    .from("sales_order_items")
    .select("menu_variant_id, quantity, menu_variants(name, menu_items(name)), sales_orders!inner(organization_id, location_id, created_at, order_status)")
    .eq("sales_orders.organization_id", organizationId)
    .eq("sales_orders.location_id", locationId)
    .gte("sales_orders.created_at", start.toISOString())
    .in("sales_orders.order_status", ["CONFIRMED", "PREPARING", "READY", "COMPLETED"]);

  if (!items || items.length === 0) return [];

  const variantMap = new Map<string, { name: string; variantName: string; quantity: number }>();
  items.forEach(item => {
    const id = item.menu_variant_id;
    const v = item.menu_variants as any;
    const itemName = v?.menu_items?.name || "Unknown";
    const variantName = v?.name || "";
    if (!variantMap.has(id)) {
      variantMap.set(id, { name: itemName, variantName, quantity: 0 });
    }
    variantMap.get(id)!.quantity += item.quantity;
  });

  const total = Array.from(variantMap.values()).reduce((s, v) => s + v.quantity, 0);
  return Array.from(variantMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(v => ({ ...v, pct: total > 0 ? Math.round((v.quantity / total) * 100) : 0 }));
}

// ─── Warehouse stock levels ───────────────────────────────────────────────────
export async function getWarehouseStockLevels(organizationId: string, locationId: string) {
  const supabase = await createClient();

  const [snapshotRes, policiesRes] = await Promise.all([
    supabase
      .from("inventory_snapshot")
      .select("ingredient_id, quantity_on_hand, ingredients(id, name, min_stock, max_stock, units!base_unit_id(symbol))")
      .eq("organization_id", organizationId)
      .eq("location_id", locationId),
    supabase
      .from("inventory_alert_policies")
      .select("ingredient_id, warning_level, critical_level, out_of_stock_level")
      .eq("organization_id", organizationId)
      .eq("location_id", locationId)
      .is("deleted_at", null)
  ]);

  const policiesMap = new Map();
  if (policiesRes.data) {
    for (const p of policiesRes.data) {
      policiesMap.set(p.ingredient_id, p);
    }
  }

  return (snapshotRes.data || []).map(row => {
    const ing = row.ingredients as any;
    const policy = policiesMap.get(row.ingredient_id);
    const current = Number(row.quantity_on_hand);
    
    // Fallbacks if no policy
    const min = Number(ing?.min_stock) || 0;
    const max = Number(ing?.max_stock) || 0;

    return {
      name: ing?.name || "Unknown",
      unit: ing?.units?.symbol || "",
      current,
      min,
      max,
      warning_level: policy ? Number(policy.warning_level) : min,
      critical_level: policy ? Number(policy.critical_level) : (min * 0.5),
      out_of_stock_level: policy ? Number(policy.out_of_stock_level) : 0,
      isBelowMin: current < (policy ? Number(policy.warning_level) : min),
      hasPolicy: !!policy
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
