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

  // 2. Fetch Global Units and Tax Categories
  const [{ data: allUnits }, { data: allTaxCategories }] = await Promise.all([
    supabase
      .from("units")
      .select("id, name, symbol")
      .is("deleted_at", null),
    supabase
      .from("tax_categories")
      .select("id, name, tax_rates(rate_percentage)")
      .is("deleted_at", null),
  ]);

  const unitMap = new Map<string, { name: string; symbol: string }>();
  if (allUnits) {
    allUnits.forEach((u) => {
      unitMap.set(u.id, { name: u.name, symbol: u.symbol });
    });
  }

  const taxMap = new Map<string, number>();
  if (allTaxCategories) {
    allTaxCategories.forEach((tc: any) => {
      const rates = tc.tax_rates;
      const rate = rates && rates.length > 0 ? Number(rates[0].rate_percentage) : 0;
      taxMap.set(tc.id, rate);
    });
  }

  // 3. Purchase Orders Query
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
        tax_category_id,
        unit_id,
        ingredients ( name, base_unit_id )
      )
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const validPos = pos || [];

  // Formatted Purchase Orders with tax calculation and units
  const formattedPos = validPos.map((po: any) => {
    let poBaseSubtotal = 0;
    let poTaxTotal = 0;

    const items = po.purchase_order_items?.map((item: any) => {
      const u = item.unit_id
        ? unitMap.get(item.unit_id)
        : item.ingredients?.base_unit_id
        ? unitMap.get(item.ingredients.base_unit_id)
        : null;
      const unitSymbol = u?.symbol || u?.name || "";
      const qty = Number(item.quantity || 0);
      const unitCost = Number(item.expected_cost || 0);
      const baseAmount = qty * unitCost;
      const taxRate = item.tax_category_id ? (taxMap.get(item.tax_category_id) || 0) : 0;
      const taxAmount = baseAmount * (taxRate / 100);
      const lineTotal = baseAmount + taxAmount;

      poBaseSubtotal += baseAmount;
      poTaxTotal += taxAmount;

      return {
        name: item.ingredients?.name || "Purchase Ingredient",
        quantity: qty,
        unit: unitSymbol,
        unit_cost: unitCost,
        base_amount: baseAmount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: lineTotal,
      };
    }) || [];

    const calculatedGrandTotal = poBaseSubtotal + poTaxTotal;
    const finalAmount = calculatedGrandTotal > 0 ? calculatedGrandTotal : Number(po.total_expected_cost || 0);

    return {
      id: po.id,
      type: "PO" as const,
      reference_number: po.po_number || `PO-${po.id.slice(0, 6)}`,
      entity_name: po.suppliers?.name || "Direct Supplier",
      location_id: po.location_id,
      location_name: po.locations?.name || "Warehouse",
      amount: finalAmount,
      base_amount: poBaseSubtotal,
      tax_amount: poTaxTotal,
      status: po.status,
      date: po.created_at,
      items_count: items.length,
      items,
    };
  });

  const totalPoValue = formattedPos
    .filter((po) => ["APPROVED", "SENT", "PARTIAL", "COMPLETED"].includes(po.status))
    .reduce((acc, po) => acc + po.amount, 0);

  const pendingPosCount = validPos.filter((po) =>
    ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"].includes(po.status)
  ).length;
  const completedPosCount = validPos.filter((po) => po.status === "COMPLETED").length;

  // 4. Goods Receipts Query
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
        tax_category_id,
        purchase_unit_id,
        ingredients ( name, base_unit_id )
      )
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const validGrns = grns || [];

  // Formatted Goods Receipts with tax calculation and units
  const formattedGrns = validGrns.map((g: any) => {
    let grnBaseSubtotal = 0;
    let grnTaxTotal = 0;

    const items = g.goods_receipt_items?.map((item: any) => {
      const u = item.purchase_unit_id
        ? unitMap.get(item.purchase_unit_id)
        : item.ingredients?.base_unit_id
        ? unitMap.get(item.ingredients.base_unit_id)
        : null;
      const unitSymbol = u?.symbol || u?.name || "";
      const qty = Number(item.received_quantity || 0);
      const unitCost = Number(item.unit_cost || 0);
      const baseAmount = Number(item.line_total || qty * unitCost);
      const taxRate = item.tax_category_id ? (taxMap.get(item.tax_category_id) || 0) : 0;
      const taxAmount = baseAmount * (taxRate / 100);
      const lineTotal = baseAmount + taxAmount;

      grnBaseSubtotal += baseAmount;
      grnTaxTotal += taxAmount;

      return {
        name: item.ingredients?.name || "Received Good",
        quantity: qty,
        unit: unitSymbol,
        unit_cost: unitCost,
        base_amount: baseAmount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: lineTotal,
      };
    }) || [];

    const grnGrandTotal = grnBaseSubtotal + grnTaxTotal;

    return {
      id: g.id,
      type: "GRN" as const,
      reference_number: g.grn_number || `GRN-${g.id.slice(0, 6)}`,
      po_id: g.purchase_order_id,
      po_number: g.purchase_orders?.po_number || null,
      entity_name: g.suppliers?.name || "Supplier",
      location_id: g.warehouse_location_id,
      location_name: g.locations?.name || "Facility",
      amount: grnGrandTotal,
      base_amount: grnBaseSubtotal,
      tax_amount: grnTaxTotal,
      status: g.status,
      date: g.received_date || g.created_at,
      items_count: items.length,
      items,
    };
  });

  const postedGrns = formattedGrns.filter((g) => g.status === "POSTED");
  const totalGrnValue = postedGrns.reduce((acc, g) => acc + g.amount, 0);

  // 5. Sales Orders Query
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

  // Formatted Sales Orders
  const formattedSales = validSales.map((s: any) => {
    const sSubtotal = Number(s.subtotal || 0);
    const sTax = Number(s.tax_amount || 0);
    const sGrand = Number(s.grand_total || (sSubtotal + sTax));
    const effectiveTaxRate = sSubtotal > 0 ? (sTax / sSubtotal) * 100 : 0;

    const items = s.sales_order_items?.map((item: any) => {
      const vName = item.menu_variants?.name;
      const mName = item.menu_variants?.menu_items?.name || "Menu Item";
      const displayName = vName && vName.toLowerCase() !== "default" ? `${mName} (${vName})` : mName;
      const qty = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const baseAmount = Number(item.line_total || qty * unitPrice);
      const itemTax = baseAmount * (effectiveTaxRate / 100);
      const itemTotal = baseAmount + itemTax;

      return {
        name: displayName,
        quantity: qty,
        unit: "pcs",
        unit_cost: unitPrice,
        base_amount: baseAmount,
        tax_rate: Number(effectiveTaxRate.toFixed(1)),
        tax_amount: itemTax,
        total: itemTotal,
      };
    }) || [];

    return {
      id: s.id,
      type: "SALE" as const,
      reference_number: s.order_number || `SO-${s.id.slice(0, 6)}`,
      entity_name: `Sales Order`,
      location_id: s.location_id,
      location_name: s.locations?.name || "Shop Outlet",
      amount: sGrand,
      base_amount: sSubtotal,
      tax_amount: sTax,
      status: s.order_status,
      date: s.created_at,
      items_count: items.length,
      items,
    };
  });

  const totalSalesRevenue = formattedSales.reduce((acc, s) => acc + s.amount, 0);
  const totalTaxCollected = formattedSales.reduce((acc, s) => acc + (s.tax_amount || 0), 0);
  const totalSalesCount = formattedSales.length;
  const avgOrderValue = totalSalesCount > 0 ? totalSalesRevenue / totalSalesCount : 0;

  // 6. Financial Margin Ratios
  const netProcurementCost = totalGrnValue > 0 ? totalGrnValue : totalPoValue;
  const grossProfitMargin = totalSalesRevenue - netProcurementCost;
  const marginPercentage = totalSalesRevenue > 0 ? (grossProfitMargin / totalSalesRevenue) * 100 : 0;

  // 7. Timeline Generation (using tax-inclusive amounts)
  const allDates = [
    ...formattedSales.map((s) => s.date),
    ...formattedPos.map((p) => p.date),
    ...formattedGrns.map((g) => g.date),
  ].map((d) => new Date(d)).filter((d) => !isNaN(d.getTime()));

  const refDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();

  const timelineMap = new Map<string, { date: string; sales: number; procurement: number; receipts: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    timelineMap.set(key, { date: key, sales: 0, procurement: 0, receipts: 0 });
  }

  formattedSales.forEach((s) => {
    const key = new Date(s.date).toISOString().split("T")[0];
    if (timelineMap.has(key)) {
      const entry = timelineMap.get(key)!;
      entry.sales += Number(s.amount || 0);
    }
  });

  formattedPos.forEach((po) => {
    if (["APPROVED", "SENT", "PARTIAL", "COMPLETED"].includes(po.status)) {
      const key = new Date(po.date).toISOString().split("T")[0];
      if (timelineMap.has(key)) {
        const entry = timelineMap.get(key)!;
        entry.procurement += Number(po.amount || 0);
      }
    }
  });

  postedGrns.forEach((g) => {
    const key = new Date(g.date).toISOString().split("T")[0];
    if (timelineMap.has(key)) {
      const entry = timelineMap.get(key)!;
      entry.receipts += Number(g.amount || 0);
    }
  });

  const timeline = Array.from(timelineMap.values());

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
