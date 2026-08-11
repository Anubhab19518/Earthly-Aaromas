"use client";

import { useState } from "react";
import { Search, Plus, MapPin, Tag, Package, Hash, Activity, Clock } from "lucide-react";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";
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
  const [columns, setColumns] = useState([
    { key: "location", label: "Location", visible: true },
    { key: "category", label: "Category", visible: true },
    { key: "ingredient", label: "Ingredient", visible: true },
    { key: "qty", label: "Current Qty", visible: true },
    { key: "status", label: "Status", visible: true },
    { key: "last_update", label: "Last Update", visible: true },
  ]);

  const toggleColumn = (key: string) =>
    setColumns((prev) => prev.map((c) => c.key === key ? { ...c, visible: !c.visible } : c));

  const col = (key: string) => columns.find((c) => c.key === key)?.visible ?? true;

  const [activeSort, setActiveSort] = useState("location-asc");

  const sortOptions = [
    { label: "Location (A-Z)", value: "location-asc" },
    { label: "Location (Z-A)", value: "location-desc" },
    { label: "Ingredient (A-Z)", value: "ingredient-asc" },
    { label: "Ingredient (Z-A)", value: "ingredient-desc" },
    { label: "Quantity (High-Low)", value: "qty-desc" },
    { label: "Quantity (Low-High)", value: "qty-asc" },
    { label: "Last Updated (Newest)", value: "date-desc" },
    { label: "Last Updated (Oldest)", value: "date-asc" },
  ];

  const filteredSnapshots = (locationFilter
    ? snapshots.filter((s) => s.location_id === locationFilter)
    : snapshots).sort((a, b) => {
      const [by, dir] = activeSort.split("-");
      const mod = dir === "asc" ? 1 : -1;
      if (by === "location") {
        const locA = locations.find(l => l.id === a.location_id)?.name || "";
        const locB = locations.find(l => l.id === b.location_id)?.name || "";
        return locA.localeCompare(locB) * mod;
      }
      if (by === "ingredient") {
        const ingA = ingredients.find(i => i.id === a.ingredient_id)?.name || "";
        const ingB = ingredients.find(i => i.id === b.ingredient_id)?.name || "";
        return ingA.localeCompare(ingB) * mod;
      }
      if (by === "qty") return (Number(a.quantity_on_hand) - Number(b.quantity_on_hand)) * mod;
      if (by === "date") return (new Date(a.last_movement_at).getTime() - new Date(b.last_movement_at).getTime()) * mod;
      return 0;
    });

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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ingredient or location..."
            className="pl-9 pr-4 py-2 w-[300px] text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 appearance-none bg-white min-w-[150px]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundPosition: "right 8px center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.2em 1.2em",
              paddingRight: "2.5rem"
            }}
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <button
            onClick={() => setIsAdjustmentOpen(true)}
            className="rounded-lg bg-[#254f8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e4070] transition-colors"
          >
            Adjust Stock
          </button>
        </div>
      </div>

      <TableToolbar 
        columns={columns} 
        onColumnToggle={toggleColumn} 
        sortOptions={sortOptions} 
        activeSort={activeSort} 
        onSortChange={setActiveSort} 
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#f8fafc] border-b border-slate-200">
            <tr className="divide-x divide-slate-200">
              {col("location") && <th scope="col" className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Location</div></th>}
              {col("category") && <th scope="col" className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Category</div></th>}
              {col("ingredient") && <th scope="col" className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />Ingredient</div></th>}
              {col("qty") && <th scope="col" className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />Current Qty</div></th>}
              {col("status") && <th scope="col" className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />Status</div></th>}
              {col("last_update") && <th scope="col" className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Last Update</div></th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredSnapshots.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
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

                // Determine custom color classes based on status to match reference aesthetic
                let statusClass = "text-slate-600";
                if (status.label === "OUT OF STOCK" || status.label === "CRITICAL") statusClass = "text-rose-600 font-bold";
                else if (status.label === "LOW STOCK") statusClass = "text-amber-600 font-bold";
                else statusClass = "text-[#254f8a] font-bold";

                return (
                  <tr key={snapshot.id} className="hover:bg-slate-50 transition-colors divide-x divide-slate-200">
                    {col("location") && <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{location?.name || "-"}</td>}
                    {col("category") && <td className="px-6 py-4 whitespace-nowrap text-slate-600">{category?.name || "-"}</td>}
                    {col("ingredient") && <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700"><span title={ingredient?.name}>{ingredient?.name || "-"}</span></td>}
                    {col("qty") && <td className="px-6 py-4 whitespace-nowrap text-slate-700">{Number(snapshot.quantity_on_hand)} <span className="text-slate-400 ml-1">{unit?.symbol || ""}</span></td>}
                    {col("status") && <td className="px-6 py-4 whitespace-nowrap"><span className={statusClass}>{status.label === "OK" ? "Healthy" : status.label.charAt(0) + status.label.slice(1).toLowerCase()}</span></td>}
                    {col("last_update") && <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {new Intl.DateTimeFormat("en-IN", {
                        hour: "2-digit", minute: "2-digit", hour12: true,
                        day: "2-digit", month: "2-digit", year: "numeric"
                      }).format(new Date(snapshot.last_movement_at)).replace(',', '').toLowerCase()}
                    </td>}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
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

