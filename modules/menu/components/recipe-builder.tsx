"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { RecipeItemDialog } from "./recipe-item-dialog";
import { deleteRecipeItem } from "../services/menu.actions";

interface RecipeItem {
  id: string;
  ingredient_id: string;
  quantity_in_base_unit: number;
  ingredients?: {
    name: string;
    units?: {
      name: string;
    };
  };
}

interface Ingredient {
  id: string;
  name: string;
  base_unit_id: string;
}

interface Unit {
  id: string;
  name: string;
  measurement_category?: string;
}

interface Props {
  variantId: string;
  recipeItems: RecipeItem[];
  ingredients: Ingredient[];
  units: Unit[];
}

export function RecipeBuilder({ variantId, recipeItems, ingredients, units }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm mt-6">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Recipe (Bill of Materials)</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Define the ingredients consumed when this variant is sold.
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a4f20]"
        >
          <Plus className="h-4 w-4" />
          Add Ingredient
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-6 py-3 font-medium">Ingredient</th>
              <th className="px-6 py-3 font-medium">Quantity (Base Unit)</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {recipeItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">
                  No ingredients added yet.
                </td>
              </tr>
            ) : (
              recipeItems.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-4 font-medium text-zinc-900">
                    {item.ingredients?.name}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {Number(item.quantity_in_base_unit).toFixed(4)} {item.ingredients?.units?.name}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <form action={deleteRecipeItem} className="inline-block">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="variant_id" value={variantId} />
                      <button
                        type="submit"
                        className="text-red-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RecipeItemDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        variantId={variantId}
        ingredients={ingredients}
        units={units}
      />
    </div>
  );
}

