"use server";

import { createClient } from "@/shared/lib/supabase/server";

export interface AuditFilter {
  actorId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export async function getAuditLog(organizationId: string, filter: AuditFilter) {
  const supabase = await createClient();
  const page = filter.page || 1;
  const pageSize = filter.pageSize || 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase
    .from("audit_log")
    .select("*, profiles(full_name)", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false });

  if (filter.actorId) {
    query = query.eq("actor_id", filter.actorId);
  }
  if (filter.action) {
    query = query.ilike("action", `%${filter.action}%`);
  }
  if (filter.entityType) {
    query = query.eq("entity_type", filter.entityType);
  }
  if (filter.startDate) {
    query = query.gte("occurred_at", filter.startDate);
  }
  if (filter.endDate) {
    const endDt = new Date(filter.endDate);
    endDt.setDate(endDt.getDate() + 1);
    query = query.lt("occurred_at", endDt.toISOString());
  }

  const { data, count, error } = await query.range(start, end);

  if (error) {
    console.error("Error fetching audit log:", JSON.stringify(error, null, 2));
    throw new Error("Failed to fetch audit log");
  }

  let processedData = data || [];

  if (processedData.length > 0) {
    const orderIds = processedData.filter(d => d.entity_type === "sales_orders" && d.entity_id).map(d => d.entity_id);
    const grnIds = processedData.filter(d => d.entity_type === "goods_receipts" && d.entity_id).map(d => d.entity_id);
    const transferIds = processedData.filter(d => d.entity_type === "stock_transfers" && d.entity_id).map(d => d.entity_id);
    const poIds = processedData.filter(d => d.entity_type === "purchase_orders" && d.entity_id).map(d => d.entity_id);

    const [ { data: orders }, { data: grns }, { data: transfers }, { data: pos } ] = await Promise.all([
      orderIds.length > 0 ? supabase.from("sales_orders").select("id, order_number").in("id", orderIds) : Promise.resolve({ data: [] }),
      grnIds.length > 0 ? supabase.from("goods_receipts").select("id, grn_number").in("id", grnIds) : Promise.resolve({ data: [] }),
      transferIds.length > 0 ? supabase.from("stock_transfers").select("id, transfer_number").in("id", transferIds) : Promise.resolve({ data: [] }),
      poIds.length > 0 ? supabase.from("purchase_orders").select("id, po_number").in("id", poIds) : Promise.resolve({ data: [] }),
    ]);

    processedData = processedData.map(d => {
      let formatted_entity_id = d.entity_id;
      
      if (d.entity_type === "sales_orders" && orders) {
        const order = orders.find(o => o.id === d.entity_id);
        if (order) formatted_entity_id = `Order #${order.order_number}`;
      } else if (d.entity_type === "goods_receipts" && grns) {
        const grn = grns.find(g => g.id === d.entity_id);
        if (grn) formatted_entity_id = grn.grn_number;
      } else if (d.entity_type === "stock_transfers" && transfers) {
        const transfer = transfers.find(t => t.id === d.entity_id);
        if (transfer) formatted_entity_id = transfer.transfer_number;
      } else if (d.entity_type === "purchase_orders" && pos) {
        const po = pos.find(p => p.id === d.entity_id);
        if (po) formatted_entity_id = po.po_number;
      }
      
      return { ...d, formatted_entity_id };
    });
  }

  return {
    data: processedData,
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };
}
