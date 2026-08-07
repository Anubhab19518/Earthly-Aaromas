"use client";

import { useState } from "react";
import { InventorySnapshot } from "@/modules/inventory/schemas/inventory.schema";
import { Ingredient, IngredientCategory } from "@/modules/ingredients/schemas/ingredient.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { InventoryAlertPolicy } from "@/modules/inventory/schemas/alert-policy.schema";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

interface InventoryDashboardProps {
  snapshots: InventorySnapshot[];
  ingredients: Ingredient[];
  categories: IngredientCategory[];
  locations: Location[];
  units: Unit[];
  alertPolicies: InventoryAlertPolicy[];
}

export function InventoryDashboard({
  snapshots,
  ingredients,
  categories,
  locations,
  units,
  alertPolicies,
}: InventoryDashboardProps) {
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>("");

  const filteredSnapshots = locationFilter
    ? snapshots.filter((s) => s.location_id === locationFilter)
    : snapshots;

  const getStatusInfo = (snapshot: InventorySnapshot) => {
    const policy = alertPolicies.find(
      (p) => p.ingredient_id === snapshot.ingredient_id && p.location_id === snapshot.location_id
    );

    if (!policy) return { label: "OK", colorClass: "bg-green-100 text-green-800" };

    const qty = Number(snapshot.quantity_on_hand);
    if (qty <= Number(policy.out_of_stock_level)) {
      return { label: "OUT OF STOCK", colorClass: "bg-red-100 text-red-800" };
    }
    if (qty <= Number(policy.critical_level)) {
      return { label: "CRITICAL", colorClass: "bg-red-100 text-red-800" };
    }
    if (qty <= Number(policy.warning_level)) {
      return { label: "LOW STOCK", colorClass: "bg-yellow-100 text-yellow-800" };
    }

    return { label: "OK", colorClass: "bg-green-100 text-green-800" };
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Inventory Dashboard</h2>
          <p className="text-sm text-zinc-500">Real-time view of current stock levels across all locations.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <button
            onClick={() => setIsAdjustmentOpen(true)}
            className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a4f20]"
          >
            Opening Stock / Adjustment
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Location</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Category</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Ingredient</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Current Qty</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Last Movement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {filteredSnapshots.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No inventory data found. Post a stock adjustment to initialize ledger.
                </td>
              </tr>
            ) : (
              filteredSnapshots.map((snapshot) => {
                const location = locations.find((l) => l.id === snapshot.location_id);
                const ingredient = ingredients.find((i) => i.id === snapshot.ingredient_id);
                const category = categories.find((c) => c.id === ingredient?.category_id);
                const unit = units.find((u) => u.id === ingredient?.base_unit_id);
                const status = getStatusInfo(snapshot);

                return (
                  <tr key={snapshot.id} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                      {location?.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                      {category?.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                      {ingredient?.name || "-"}
                      <div className="text-xs text-zinc-400 font-mono mt-0.5">{ingredient?.sku || ""}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-zinc-700">
                      {Number(snapshot.quantity_on_hand)} <span className="text-zinc-500 font-normal">{unit?.symbol || ""}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.colorClass}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-xs text-zinc-500">
                      {new Intl.DateTimeFormat("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(snapshot.last_movement_at))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <StockAdjustmentDialog
        ingredients={ingredients}
        locations={locations}
        units={units}
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
      />
    </div>
  );
}

