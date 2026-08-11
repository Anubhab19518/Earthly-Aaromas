"use server";

import { createClient } from "@/shared/lib/supabase/server";

export interface StockMovementPoint {
  date: string;     // ISO date string (YYYY-MM-DD)
  quantity: number;  // running stock level at end of day
}

export interface IngredientOption {
  id: string;
  name: string;
  unit: string;
  criticalLevel: number;
}

export async function getWarehouseIngredients(
  organizationId: string,
  locationId: string
): Promise<IngredientOption[]> {
  const supabase = await createClient();

  const [snapshotRes, policiesRes] = await Promise.all([
    supabase
      .from("inventory_snapshot")
      .select("ingredient_id, quantity_on_hand, ingredients(id, name, units!base_unit_id(symbol))")
      .eq("organization_id", organizationId)
      .eq("location_id", locationId),
    supabase
      .from("inventory_alert_policies")
      .select("ingredient_id, critical_level")
      .eq("organization_id", organizationId)
      .eq("location_id", locationId)
      .is("deleted_at", null),
  ]);

  const policiesMap = new Map<string, number>();
  if (policiesRes.data) {
    for (const p of policiesRes.data) {
      policiesMap.set(p.ingredient_id, Number(p.critical_level) || 0);
    }
  }

  return (snapshotRes.data || [])
    .map((row: any) => ({
      id: row.ingredient_id as string,
      name: (row.ingredients?.name || "Unknown") as string,
      unit: (row.ingredients?.units?.symbol || "") as string,
      criticalLevel: policiesMap.get(row.ingredient_id) || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getIngredientMovementHistory(
  organizationId: string,
  locationId: string,
  ingredientId: string
): Promise<StockMovementPoint[]> {
  const supabase = await createClient();

  // Get current stock level
  const { data: snapshot } = await supabase
    .from("inventory_snapshot")
    .select("quantity_on_hand")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .eq("ingredient_id", ingredientId)
    .maybeSingle();

  const currentStock = Number(snapshot?.quantity_on_hand) || 0;

  // Get all ledger entries for this ingredient at this location in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: ledgerEntries } = await supabase
    .from("inventory_ledger")
    .select("quantity_change, created_at")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .eq("ingredient_id", ingredientId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  // Group changes by date
  const dailyChanges = new Map<string, number>();
  for (const entry of ledgerEntries || []) {
    const dateKey = new Date(entry.created_at).toISOString().split("T")[0];
    dailyChanges.set(dateKey, (dailyChanges.get(dateKey) || 0) + Number(entry.quantity_change));
  }

  // Build list of all 30 dates
  const dates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  // Work backwards from current stock to compute historical levels.
  // currentStock = stockAtDayStart(today) + changes(today)
  // So stockAtEndOfDay(date) = currentStock - sum(changes from date+1 to today)
  const totalChangeAfter = new Map<string, number>();
  let cumulative = 0;
  // Walk from today backwards
  for (let i = dates.length - 1; i >= 0; i--) {
    totalChangeAfter.set(dates[i], cumulative);
    const dayChange = dailyChanges.get(dates[i]) || 0;
    cumulative += dayChange;
  }

  // The stock at end of each day:
  // endOfDay(date) = currentStock - totalChangeAfter(date)
  // (where totalChangeAfter = sum of changes strictly after that date up to now)
  // But we need to think about it differently:
  // currentStock includes all changes up to now
  // endOfDay(date) = currentStock - sum of changes from (date+1) to today
  // totalChangeAfter already stores sum from (date+1) to today for each date

  return dates.map((date) => ({
    date,
    quantity: Math.max(0, currentStock - (totalChangeAfter.get(date) || 0)),
  }));
}
