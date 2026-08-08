"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { addPurchaseOrderItem } from "@/modules/purchasing/services/purchase-order.actions";

interface IngredientConversion {
  ingredient_id: string;
  from_unit_id: string;
}

export function PurchaseOrderItemForm({
  poId,
  ingredients,
  units,
  taxCategories,
  ingredientConversions,
  onSuccess,
}: {
  poId: string;
  ingredients: any[];
  units: any[];
  taxCategories: any[];
  ingredientConversions: IngredientConversion[];
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(addPurchaseOrderItem, null);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");

  useEffect(() => {
    if (state === null && !isPending) {
      // handled by onSuccess via form submit
    }
  }, [state, isPending]);

  // Build filtered units for the selected ingredient:
  // 1. Always include the ingredient's own base_unit_id (1:1, no conversion needed)
  // 2. Include any unit that has a configured conversion for this ingredient
  const selectedIngredient = ingredients.find(i => i.id === selectedIngredientId);

  const filteredUnits = selectedIngredient
    ? units.filter(u => {
        // Base unit — always valid
        if (u.id === selectedIngredient.base_unit_id) return true;
        // Check if there's a configured conversion from this unit to the ingredient's base unit
        return ingredientConversions.some(
          c => c.ingredient_id === selectedIngredientId && c.from_unit_id === u.id
        );
      })
    : [];

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        setTimeout(() => {
          onSuccess();
        }, 500);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="poId" value={poId} />

      {state?.message && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{state.message}</p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="ingredientId" className="block text-sm font-medium text-zinc-700">
          Ingredient <span className="text-red-500">*</span>
        </label>
        <select
          name="ingredientId"
          required
          value={selectedIngredientId}
          onChange={(e) => setSelectedIngredientId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-[#4a632a] focus:outline-none focus:ring-1 focus:ring-[#4a632a]"
        >
          <option value="">Select ingredient</option>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="quantity" className="block text-sm font-medium text-zinc-700">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="0.001"
            min="0.001"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-[#4a632a] focus:outline-none focus:ring-1 focus:ring-[#4a632a]"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="unitId" className="block text-sm font-medium text-zinc-700">
            Unit <span className="text-red-500">*</span>
          </label>
          <select
            name="unitId"
            required
            disabled={!selectedIngredientId}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-[#4a632a] focus:outline-none focus:ring-1 focus:ring-[#4a632a] disabled:bg-zinc-100 disabled:text-zinc-500"
          >
            <option value="">
              {selectedIngredientId
                ? filteredUnits.length === 0
                  ? "No units configured"
                  : "Select unit"
                : "Select ingredient first"}
            </option>
            {filteredUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.abbreviation})
                {u.id === selectedIngredient?.base_unit_id ? " — base unit" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="expectedCost" className="block text-sm font-medium text-zinc-700">
            Expected Unit Cost (₹) <span className="text-red-500">*</span>
          </label>
          <input
            id="expectedCost"
            name="expectedCost"
            type="number"
            step="0.01"
            min="0"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-[#4a632a] focus:outline-none focus:ring-1 focus:ring-[#4a632a]"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="taxCategoryId" className="block text-sm font-medium text-zinc-700">
            Tax Category
          </label>
          <select
            name="taxCategoryId"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-[#4a632a] focus:outline-none focus:ring-1 focus:ring-[#4a632a]"
          >
            <option value="">No Tax</option>
            {taxCategories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onSuccess}
          disabled={isPending}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 h-9 px-4 py-2 disabled:pointer-events-none disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-[#587333] text-zinc-50 shadow hover:bg-[#587333]/90 h-9 px-4 py-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Item
        </button>
      </div>
    </form>
  );
}
