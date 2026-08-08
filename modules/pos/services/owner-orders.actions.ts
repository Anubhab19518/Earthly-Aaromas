"use server";

import { createClient } from "@/shared/lib/supabase/server";

export interface OrderFilter {
  locationId?: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export async function getOwnerOrders(organizationId: string, filter: OrderFilter) {
  const supabase = await createClient();
  const page = filter.page || 1;
  const pageSize = filter.pageSize || 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase
    .from("sales_orders")
    .select("id, order_number, order_status, grand_total, customer_name, customer_phone, created_at, completed_at, locations!inner(name), users:created_by(id)", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filter.locationId) {
    query = query.eq("location_id", filter.locationId);
  }
  if (filter.orderNumber) {
    query = query.ilike("order_number", `%${filter.orderNumber}%`);
  }
  if (filter.customerName) {
    query = query.ilike("customer_name", `%${filter.customerName}%`);
  }
  if (filter.customerPhone) {
    query = query.ilike("customer_phone", `%${filter.customerPhone}%`);
  }
  if (filter.status) {
    query = query.eq("order_status", filter.status);
  }
  if (filter.startDate) {
    query = query.gte("created_at", filter.startDate);
  }
  if (filter.endDate) {
    const endDt = new Date(filter.endDate);
    endDt.setDate(endDt.getDate() + 1);
    query = query.lt("created_at", endDt.toISOString());
  }

  const { data, count, error } = await query.range(start, end);

  if (error) {
    console.error("Error fetching orders:", error);
    throw new Error("Failed to fetch orders");
  }

  // Fetch creator names since created_by points to auth.users and we need profiles
  // Alternatively we could have a view, but let's just fetch them if data exists
  let enrichedData = data;
  if (data && data.length > 0) {
    const userIds = Array.from(new Set(data.filter(d => (d.users as any)?.id).map(d => (d.users as any).id)));
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds as string[]);
      
      enrichedData = data.map(order => ({
        ...order,
        creator_name: profiles?.find(p => p.id === (order.users as any)?.id)?.full_name || "Unknown"
      }));
    }
  }

  return {
    data: enrichedData || [],
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };
}
