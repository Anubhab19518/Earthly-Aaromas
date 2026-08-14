"use server";

import { createClient } from "@/shared/lib/supabase/server";

export interface LedgerFilter {
  locationId?: string;
  ingredientId?: string;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function getInventoryLedger(organizationId: string, filter: LedgerFilter) {
  const supabase = await createClient();
  const page = filter.page || 1;
  const pageSize = filter.pageSize || 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase
    .from("inventory_ledger")
    .select("*, locations(name), ingredients(name), units(symbol), profiles(full_name)", { count: "exact" })
    .eq("organization_id", organizationId);

  if (filter.sortBy === "ingredient") {
    query = query.order("ingredient_id", { ascending: filter.sortOrder === "asc" }).order("created_at", { ascending: false });
  } else if (filter.sortBy === "location") {
    query = query.order("location_id", { ascending: filter.sortOrder === "asc" }).order("created_at", { ascending: false });
  } else if (filter.sortBy === "type") {
    query = query.order("transaction_type", { ascending: filter.sortOrder === "asc" }).order("created_at", { ascending: false });
  } else {
    // Default is created_at
    query = query.order("created_at", { ascending: filter.sortOrder === "asc" });
  }

  if (filter.locationId && filter.locationId !== "all") {
    query = query.eq("location_id", filter.locationId);
  }
  if (filter.ingredientId && filter.ingredientId !== "all") {
    query = query.eq("ingredient_id", filter.ingredientId);
  }
  if (filter.transactionType && filter.transactionType !== "all") {
    query = query.eq("transaction_type", filter.transactionType);
  }
  if (filter.startDate) {
    query = query.gte("created_at", filter.startDate);
  }
  if (filter.endDate) {
    // Add 1 day to end date to make it inclusive of the entire day
    const end = new Date(filter.endDate);
    end.setDate(end.getDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  const { data, count, error } = await query.range(start, end);

  if (error) {
    console.error("Error fetching inventory ledger:", error.message, error.details, error.hint, error.code);
    throw new Error("Failed to fetch inventory ledger: " + error.message);
  }

  let processedData = data || [];

  if (processedData.length > 0) {
    const orderIds = processedData.filter(d => d.reference_type === "RECIPE_CONSUMPTION" && d.reference_id).map(d => d.reference_id);
    const transferNumbers = processedData.filter(d => (d.reference_type === "TRANSFER_IN" || d.reference_type === "TRANSFER_OUT" || d.reference_type === "STOCK_TRANSFER") && d.reference_id).map(d => d.reference_id);

    const [ { data: orders }, { data: transfers }, { data: locations } ] = await Promise.all([
      orderIds.length > 0 ? supabase.from("sales_orders").select("id, order_number").in("id", orderIds) : Promise.resolve({ data: [] }),
      transferNumbers.length > 0 ? supabase.from("stock_transfers").select("transfer_number, source_location_id, destination_location_id").in("transfer_number", transferNumbers) : Promise.resolve({ data: [] }),
      transferNumbers.length > 0 ? supabase.from("locations").select("id, name").eq("organization_id", organizationId) : Promise.resolve({ data: [] }),
    ]);

    processedData = processedData.map(d => {
      let formatted_reference = d.reference_id;
      
      if (d.reference_type === "RECIPE_CONSUMPTION" && orders) {
        const order = orders.find(o => o.id === d.reference_id);
        if (order) formatted_reference = `Order #${order.order_number}`;
      } else if ((d.reference_type === "TRANSFER_IN" || d.reference_type === "TRANSFER_OUT" || d.reference_type === "STOCK_TRANSFER") && transfers) {
        const transfer = transfers.find(t => t.transfer_number === d.reference_id);
        if (transfer && locations) {
          const source = locations.find(l => l.id === transfer.source_location_id);
          const dest = locations.find(l => l.id === transfer.destination_location_id);
          if (source && dest) {
            formatted_reference = `${source.name} → ${dest.name}`;
          }
        }
      } else if (d.reference_type === "GOODS_RECEIPT") {
        formatted_reference = d.reference_id; // already grn number
      }
      
      return { ...d, formatted_reference };
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
