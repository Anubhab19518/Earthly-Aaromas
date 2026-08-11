"use client";

import { useState } from "react";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { ConversionDialog } from "./conversion-dialog";
import { DeleteConversionDialog } from "./delete-conversion-dialog";

interface ConversionsPanelProps {
  ingredient: Ingredient;
  conversions: IngredientUnitConversion[];
  units: Unit[];
  open: boolean;
  onClose: () => void;
}

export function ConversionsPanel({
  ingredient,
  conversions,
  units,
  open,
  onClose,
}: ConversionsPanelProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editConversion, setEditConversion] = useState<IngredientUnitConversion | null>(null);
  const [deleteConversion, setDeleteConversion] = useState<IngredientUnitConversion | null>(null);

  if (!open) return null;

  const baseUnit = units.find((u) => u.id === ingredient.base_unit_id);
  const ingredientConversions = conversions.filter(
    (c) => c.ingredient_id === ingredient.id
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Unit Conversions
            </h2>
            <p className="text-sm text-zinc-500">
              {ingredient.name} · Base unit:{" "}
              <span className="font-medium text-zinc-700">
                {baseUnit ? `${baseUnit.name} (${baseUnit.symbol})` : "—"}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {ingredientConversions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 text-center text-sm text-zinc-500">
              <p>No conversions defined yet.</p>
              <p className="mt-1 text-xs">
                Add a conversion so the system knows how to translate purchase quantities into{" "}
                {baseUnit?.symbol ?? "base units"}.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                      From
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Equals
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Notes
                    </th>
                    <th className="relative px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {ingredientConversions.map((conv) => {
                    const fromUnit = units.find((u) => u.id === conv.from_unit_id);
                    const toUnit = units.find((u) => u.id === conv.to_unit_id);
                    return (
                      <tr key={conv.id} className="hover:bg-zinc-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900">
                          1 {fromUnit?.symbol ?? "?"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">
                          {conv.conversion_factor} {toUnit?.symbol ?? "?"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {conv.notes ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                          <button
                            onClick={() => setEditConversion(conv)}
                            className="mr-3 text-zinc-600 hover:text-zinc-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConversion(conv)}
                            className="text-red-600 hover:text-red-900"
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

        {/* Footer */}
        <div className="border-t border-zinc-200 px-6 py-4">
          <button
            onClick={() => setIsAddOpen(true)}
            className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Add Conversion
          </button>
        </div>
      </div>

      <ConversionDialog
        ingredient={ingredient}
        units={units}
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
      />

      <ConversionDialog
        ingredient={ingredient}
        units={units}
        conversion={editConversion ?? undefined}
        open={!!editConversion}
        onOpenChange={(open) => !open && setEditConversion(null)}
      />

      <DeleteConversionDialog
        conversion={deleteConversion}
        units={units}
        open={!!deleteConversion}
        onOpenChange={(open) => !open && setDeleteConversion(null)}
      />
    </>
  );
}

