"use server";

import { createClient } from "@/shared/lib/supabase/server";

export async function getFinancialOverview(organizationId: string) {
  const supabase = await createClient();

  // 1. Total PO Value
  const { data: pos } = await supabase
    .from("purchase_orders")
    .select("total_expected_cost")
    .eq("organization_id", organizationId)
    .in("status", ["APPROVED", "SENT", "PARTIAL", "COMPLETED"]);

  const totalPoValue = pos?.reduce((acc, po) => acc + Number(po.total_expected_cost), 0) || 0;

  // 2. Total GRN Value (from GRN items)
  // For a high level overview, we can approximate it or query items
  const { data: grnItems } = await supabase
    .from("goods_receipt_items")
    .select("line_total, goods_receipts!inner(organization_id, status)")
    .eq("goods_receipts.organization_id", organizationId)
    .eq("goods_receipts.status", "POSTED");

  const totalGrnValue = grnItems?.reduce((acc, item) => acc + Number(item.line_total), 0) || 0;

  // 3. Total Sales Revenue
  const { data: sales } = await supabase
    .from("sales_orders")
    .select("grand_total")
    .eq("organization_id", organizationId)
    .neq("order_status", "CANCELLED");
    
  const totalSalesRevenue = sales?.reduce((acc, order) => acc + Number(order.grand_total), 0) || 0;

  // 4. Traceability sample: Recent GRNs and their POs
  const { data: recentGrns } = await supabase
    .from("goods_receipts")
    .select("id, grn_number, status, received_date, purchase_order_id, purchase_orders(po_number), suppliers(name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    totalPoValue,
    totalGrnValue,
    totalSalesRevenue,
    recentGrns: recentGrns || []
  };
}
