"use client";

import { useState } from "react";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { InventoryAlertPolicy } from "@/modules/inventory/schemas/alert-policy.schema";
import { AlertPolicyDialog } from "./alert-policy-dialog";
import { DeleteAlertPolicyDialog } from "./delete-alert-policy-dialog";

interface AlertPoliciesPanelProps {
  ingredient: Ingredient;
  baseUnit: Unit;
  locations: Location[];
  policies: InventoryAlertPolicy[];
  open: boolean;
  onClose: () => void;
}

export function AlertPoliciesPanel({
  ingredient,
  baseUnit,
  locations,
  policies,
  open,
  onClose,
}: AlertPoliciesPanelProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<InventoryAlertPolicy | null>(null);
  const [deletePolicy, setDeletePolicy] = useState<InventoryAlertPolicy | null>(null);

  if (!open) return null;

  const ingredientPolicies = policies.filter((p) => p.ingredient_id === ingredient.id);

  // Locations that don't have a policy yet
  const availableLocations = locations.filter(
    (loc) => !ingredientPolicies.some((p) => p.location_id === loc.id)
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />

      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Alert Policies</h2>
            <p className="text-sm text-zinc-500">
              {ingredient.name} · Unit:{" "}
              <span className="font-medium text-zinc-700">{baseUnit.name} ({baseUnit.symbol})</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {ingredientPolicies.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 text-center text-sm text-zinc-500">
              <p>No alert policies configured.</p>
              <p className="mt-1 text-xs">Add policies per location to get low stock warnings.</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-[#f8fafc] border-b border-slate-200">
                  <tr className="divide-x divide-slate-200">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Location</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Warning</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Critical</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">OOS</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {ingredientPolicies.map((policy) => {
                    const location = locations.find((l) => l.id === policy.location_id);
                    return (
                      <tr key={policy.id} className="hover:bg-slate-50 transition-colors divide-x divide-slate-200">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                          {location?.name || "Unknown Location"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-amber-600">
                          {policy.warning_level} {baseUnit.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-rose-600">
                          {policy.critical_level} {baseUnit.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-500">
                          {policy.out_of_stock_level} {baseUnit.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setEditPolicy(policy)}
                            className="mr-4 text-sky-600 hover:text-sky-900 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletePolicy(policy)}
                            className="text-rose-600 hover:text-rose-900 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 px-6 py-4">
          <button
            onClick={() => setIsAddOpen(true)}
            disabled={availableLocations.length === 0}
            className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {availableLocations.length === 0 ? "All locations configured" : "Add Policy for Location"}
          </button>
        </div>
      </div>

      <AlertPolicyDialog
        ingredient={ingredient}
        baseUnit={baseUnit}
        locations={availableLocations}
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
      />

      <AlertPolicyDialog
        ingredient={ingredient}
        baseUnit={baseUnit}
        locations={locations} // Pass all locations so the edit dialog can resolve the name
        policy={editPolicy ?? undefined}
        open={!!editPolicy}
        onOpenChange={(open) => !open && setEditPolicy(null)}
      />

      <DeleteAlertPolicyDialog
        open={!!deletePolicy}
        onOpenChange={(open) => !open && setDeletePolicy(null)}
        policy={deletePolicy}
        locationName={locations.find((l) => l.id === deletePolicy?.location_id)?.name || "Unknown Location"}
      />
    </>
  );
}

