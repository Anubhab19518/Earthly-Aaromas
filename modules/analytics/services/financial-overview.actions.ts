"use server";

import { createClient } from "@/shared/lib/supabase/server";

export async function getFinancialOverview(organizationId: string) {
  const supabase = await createClient();

  // 1. Fetch locations for filter options
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");

  // 2. PO Metrics & List
  const { data: pos } = await supabase
    .from("purchase_orders")
    .select(`
      id,
      po_number,
      status,
      total_expected_cost,
      created_at,
      location_id,
      suppliers ( id, name ),
      locations:location_id ( id, name ),
      purchase_order_items (
        id,
        quantity,
        expected_cost,
        ingredients ( name )
      )
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const validPos = pos || [];
  const totalPoValue = validPos
    .filter((po) => ["APPROVED", "SENT", "PARTIAL", "COMPLETED"].includes(po.status))
    .reduce((acc, po) => acc + Number(po.total_expected_cost || 0), 0);

  const pendingPosCount = validPos.filter((po) => ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"].includes(po.status)).length;
  const completedPosCount = validPos.filter((po) => po.status === "COMPLETED").length;

  // 3. GRN Metrics & List
  const { data: grns } = await supabase
    .from("goods_receipts")
    .select(`
      id,
      grn_number,
      status,
      received_date,
      created_at,
      purchase_order_id,
      suppliers ( id, name ),
      purchase_orders ( id, po_number ),
      locations:warehouse_location_id ( id, name ),
      goods_receipt_items (
        id,
        received_quantity,
        unit_cost,
        line_total,
        ingredients ( name )
      )
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const validGrns = grns || [];
  const postedGrns = validGrns.filter((g) => g.status === "POSTED");
  const totalGrnValue = postedGrns.reduce((acc, g) => {
    const itemsTotal = g.goods_receipt_items?.reduce((sum, item) => sum + Number(item.line_total || 0), 0) || 0;
    return acc + itemsTotal;
  }, 0);

  // 4. Sales Orders Metrics & List
  const { data: sales } = await supabase
    .from("sales_orders")
    .select(`
      id,
      order_number,
      grand_total,
      subtotal,
      tax_amount,
      order_status,
      created_at,
      location_id,
      locations:location_id ( id, name ),
      sales_order_items (
        id,
        quantity,
        unit_price,
        line_total,
        menu_variants ( name, menu_items ( name ) )
      )
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const validSales = (sales || []).filter((s) => s.order_status !== "CANCELLED");
  const totalSalesRevenue = validSales.reduce((acc, s) => acc + Number(s.grand_total || 0), 0);
  const totalTaxCollected = validSales.reduce((acc, s) => acc + Number(s.tax_amount || 0), 0);
  const totalSalesCount = validSales.length;
  const avgOrderValue = totalSalesCount > 0 ? totalSalesRevenue / totalSalesCount : 0;

  // 5. Financial Margin Ratios
  const netProcurementCost = totalGrnValue > 0 ? totalGrnValue : totalPoValue;
  const grossProfitMargin = totalSalesRevenue - netProcurementCost;
  const marginPercentage = totalSalesRevenue > 0 ? (grossProfitMargin / totalSalesRevenue) * 100 : 0;

  // 6. Intelligent Timeline Data Generation
  // Gather all dates from transactions to find relevant period window
  const allDates = [
    ...validSales.map((s) => s.created_at),
    ...validPos.map((p) => p.created_at),
    ...validGrns.map((g) => g.received_date || g.created_at),
  ].map((d) => new Date(d)).filter((d) => !isNaN(d.getTime()));

  const refDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();

  const timelineMap = new Map<string, { date: string; sales: number; procurement: number; receipts: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    timelineMap.set(key, { date: key, sales: 0, procurement: 0, receipts: 0 });
  }

  validSales.forEach((s) => {
    const key = new Date(s.created_at).toISOString().split("T")[0];
    if (timelineMap.has(key)) {
      const entry = timelineMap.get(key)!;
      entry.sales += Number(s.grand_total || 0);
    }
  });

  validPos.forEach((po) => {
    if (["APPROVED", "SENT", "PARTIAL", "COMPLETED"].includes(po.status)) {
      const key = new Date(po.created_at).toISOString().split("T")[0];
      if (timelineMap.has(key)) {
        const entry = timelineMap.get(key)!;
        entry.procurement += Number(po.total_expected_cost || 0);
      }
    }
  });

  postedGrns.forEach((g) => {
    const key = new Date(g.received_date || g.created_at).toISOString().split("T")[0];
    if (timelineMap.has(key)) {
      const entry = timelineMap.get(key)!;
      const gTotal = g.goods_receipt_items?.reduce((sum, item) => sum + Number(item.line_total || 0), 0) || 0;
      entry.receipts += gTotal;
    }
  });

  const timeline = Array.from(timelineMap.values());

  // 7. Formatted Purchase Orders
  const formattedPos = validPos.map((po: any) => ({
    id: po.id,
    type: "PO" as const,
    reference_number: po.po_number || `PO-${po.id.slice(0, 6)}`,
    entity_name: po.suppliers?.name || "Direct Supplier",
    location_id: po.location_id,
    location_name: po.locations?.name || "Warehouse",
    amount: Number(po.total_expected_cost || 0),
    status: po.status,
    date: po.created_at,
    items_count: po.purchase_order_items?.length || 0,
    items: po.purchase_order_items?.map((item: any) => ({
      name: item.ingredients?.name || "Purchase Ingredient",
      quantity: Number(item.quantity || 0),
      unit_cost: Number(item.expected_cost || 0),
      total: Number(item.quantity || 0) * Number(item.expected_cost || 0),
    })) || [],
  }));

  // 8. Formatted Goods Receipts
  const formattedGrns = validGrns.map((g: any) => {
    const gValue = g.goods_receipt_items?.reduce((sum: number, item: any) => sum + Number(item.line_total || 0), 0) || 0;
    return {
      id: g.id,
      type: "GRN" as const,
      reference_number: g.grn_number || `GRN-${g.id.slice(0, 6)}`,
      po_id: g.purchase_order_id,
      po_number: g.purchase_orders?.po_number || null,
      entity_name: g.suppliers?.name || "Supplier",
      location_id: g.warehouse_location_id,
      location_name: g.locations?.name || "Main Warehouse",
      amount: gValue,
      status: g.status,
      date: g.received_date || g.created_at,
      items_count: g.goods_receipt_items?.length || 0,
      items: g.goods_receipt_items?.map((item: any) => ({
        name: item.ingredients?.name || "Received Good",
        quantity: Number(item.received_quantity || 0),
        unit_cost: Number(item.unit_cost || 0),
        total: Number(item.line_total || 0),
      })) || [],
    };
  });

  // 9. Formatted Sales Orders
  const formattedSales = validSales.map((s: any) => ({
    id: s.id,
    type: "SALE" as const,
    reference_number: s.order_number || `SO-${s.id.slice(0, 6)}`,
    entity_name: `Sales Order`,
    location_id: s.location_id,
    location_name: s.locations?.name || "Shop Outlet",
    amount: Number(s.grand_total || 0),
    tax: Number(s.tax_amount || 0),
    status: s.order_status,
    date: s.created_at,
    items_count: s.sales_order_items?.length || 0,
    items: s.sales_order_items?.map((item: any) => {
      const vName = item.menu_variants?.name;
      const mName = item.menu_variants?.menu_items?.name || "Menu Item";
      const displayName = vName && vName.toLowerCase() !== "default" ? `${mName} (${vName})` : mName;
      return {
        name: displayName,
        quantity: Number(item.quantity || 0),
        unit_cost: Number(item.unit_price || 0),
        total: Number(item.line_total || 0),
      };
    }) || [],
  }));

  return {
    metrics: {
      totalPoValue,
      pendingPosCount,
      completedPosCount,
      totalGrnValue,
      totalSalesRevenue,
      totalTaxCollected,
      totalSalesCount,
      avgOrderValue,
      netProcurementCost,
      grossProfitMargin,
      marginPercentage,
    },
    locations: locations || [],
    timeline,
    pos: formattedPos,
    grns: formattedGrns,
    sales: formattedSales,
    recentGrns: validGrns.slice(0, 5),
  };
}
