"use client";

import { useEffect, useState, useTransition } from "react";
import { addRecipeItem } from "../services/menu.actions";

interface Ingredient {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  measurement_category?: string;
}

interface RecipeItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variantId: string;
  ingredients: Ingredient[];
  units: Unit[];
}

export function RecipeItemDialog({ open, onOpenChange, variantId, ingredients, units }: RecipeItemDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setSelectedIngredientId("");
    }
  }, [open]);

  const selectedIngredient = ingredients.find(i => i.id === selectedIngredientId);
  const selectedIngredientBaseUnit = selectedIngredient 
    ? units.find(u => u.id === (selectedIngredient as any).base_unit_id)
    : null;

  const filteredUnits = selectedIngredientBaseUnit 
    ? units.filter(u => u.measurement_category === selectedIngredientBaseUnit.measurement_category)
    : units;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    startTransition(async () => {
      setErrorMsg(null);
      const result = await addRecipeItem(null, formData);
      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Add Ingredient to Recipe</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input type="hidden" name="variant_id" value={variantId} />
          
          <div>
            <label className="block text-sm font-medium text-zinc-700">Ingredient *</label>
            <select
              name="ingredient_id"
              required
              value={selectedIngredientId}
              onChange={(e) => setSelectedIngredientId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="">Select ingredient...</option>
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Quantity *</label>
              <input
                type="number"
                name="quantity"
                step="0.01"
                min="0.01"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Unit *</label>
              <select
                name="unit_id"
                required
                disabled={!selectedIngredientId}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a] disabled:bg-zinc-100 disabled:text-zinc-500"
              >
                <option value="">{selectedIngredientId ? "Select unit..." : "Select ingredient first"}</option>
                {filteredUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            Note: If you select a unit different from the ingredient's base unit, the system will convert it automatically using defined unit conversions.
          </p>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Adding..." : "Add to Recipe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

