"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { createAdminClient } from "@/shared/lib/supabase/admin";

export interface AuditFilter {
  actorId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
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
    .eq("organization_id", organizationId);

  // Apply sorting
  if (filter.sortBy === "actor") {
    query = query.order("occurred_at", { ascending: filter.sortOrder === "asc" });
  } else if (filter.sortBy === "entity_type") {
    query = query.order("entity_type", { ascending: filter.sortOrder === "asc" }).order("occurred_at", { ascending: false });
  } else if (filter.sortBy === "action") {
    query = query.order("action", { ascending: filter.sortOrder === "asc" }).order("occurred_at", { ascending: false });
  } else {
    query = query.order("occurred_at", { ascending: filter.sortOrder === "asc" });
  }

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
    const adminClient = createAdminClient();
    const orderIds = processedData.filter(d => d.entity_type === "sales_orders" && d.entity_id).map(d => d.entity_id);
    const grnIds = processedData.filter(d => d.entity_type === "goods_receipts" && d.entity_id).map(d => d.entity_id);
    const transferIds = processedData.filter(d => d.entity_type === "stock_transfers" && d.entity_id).map(d => d.entity_id);
    const poIds = processedData.filter(d => d.entity_type === "purchase_orders" && d.entity_id).map(d => d.entity_id);
    const actorIds = Array.from(new Set(processedData.map((d: any) => d.actor_id).filter(Boolean)));

    const [
      { data: orders },
      { data: grns },
      { data: transfers },
      { data: pos },
      { data: allProfiles },
      { data: authUsersResponse }
    ] = await Promise.all([
      orderIds.length > 0 ? supabase.from("sales_orders").select("id, order_number").in("id", orderIds) : Promise.resolve({ data: [] }),
      grnIds.length > 0 ? supabase.from("goods_receipts").select("id, grn_number").in("id", grnIds) : Promise.resolve({ data: [] }),
      transferIds.length > 0 ? supabase.from("stock_transfers").select("id, transfer_number").in("id", transferIds) : Promise.resolve({ data: [] }),
      poIds.length > 0 ? supabase.from("purchase_orders").select("id, po_number").in("id", poIds) : Promise.resolve({ data: [] }),
      actorIds.length > 0 ? adminClient.from("profiles").select("id, full_name").in("id", actorIds) : Promise.resolve({ data: [] }),
      actorIds.length > 0 ? adminClient.auth.admin.listUsers() : Promise.resolve({ data: { users: [] } }),
    ]);

    const profileMap = new Map<string, string>();
    if (allProfiles) {
      allProfiles.forEach((p: any) => {
        if (p.full_name && p.full_name.trim() !== "" && p.full_name.trim() !== "Unknown") {
          profileMap.set(p.id, p.full_name.trim());
        }
      });
    }

    const authUserMap = new Map<string, { name: string; email: string }>();
    if (authUsersResponse?.users) {
      authUsersResponse.users.forEach((u: any) => {
        const meta = u.user_metadata || {};
        const metaName = meta.full_name || meta.name || meta.fullName;
        let cleanName = metaName && metaName.trim() !== "" && metaName.trim() !== "Unknown" ? metaName.trim() : "";
        if (!cleanName && u.email) {
          const prefix = u.email.split("@")[0].replace(/\d+$/, "");
          cleanName = (prefix || u.email.split("@")[0])
            .split(/[._-]/)
            .filter(Boolean)
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
        }
        authUserMap.set(u.id, {
          name: cleanName || "Team Member",
          email: u.email || "",
        });
      });
    }

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

      const authUser = d.actor_id ? authUserMap.get(d.actor_id) : null;
      const performerName =
        (d.actor_id ? profileMap.get(d.actor_id) : null) ||
        authUser?.name ||
        (d.profiles?.full_name && d.profiles.full_name.trim() !== "Unknown" ? d.profiles.full_name.trim() : null) ||
        (d.actor_id ? "Team Member" : "System Automations");

      const performerEmail = authUser?.email || "";

      return {
        ...d,
        formatted_entity_id,
        profiles: {
          full_name: performerName,
          email: performerEmail,
        }
      };
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
