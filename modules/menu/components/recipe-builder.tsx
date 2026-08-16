"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ChefHat, Scale, Layers } from "lucide-react";
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
  ingredientConversions: { ingredient_id: string; from_unit_id: string }[];
}

export function RecipeBuilder({
  variantId,
  recipeItems,
  ingredients,
  units,
  ingredientConversions,
}: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (itemId: string) => {
    if (!confirm("Are you sure you want to remove this ingredient from the recipe?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", itemId);
      fd.append("variant_id", variantId);
      await deleteRecipeItem(fd);
    });
  };

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden text-xs font-sans">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
            <ChefHat className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-slate-900">Recipe & Bill of Materials</h2>
              <span className="flex h-4.5 px-1.5 items-center justify-center rounded text-[10px] font-mono font-medium bg-slate-200 text-slate-700">
                {recipeItems.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ingredients automatically deducted from branch inventory upon POS order punch
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Ingredient</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-500 select-none">
              <th className="py-2.5 px-4 border-r border-slate-200/80 w-[55%]">Raw Material / Ingredient</th>
              <th className="py-2.5 px-4 border-r border-slate-200/80 font-mono w-[30%]">Quantity (Base Unit)</th>
              <th className="py-2.5 px-4 text-right w-[15%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs text-slate-800">
            {recipeItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-slate-400">
                  <Scale className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-600">No recipe ingredients configured</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click 'Add Ingredient' to define tea leaves, milk, spices, or cups for automatic inventory depletion
                  </p>
                </td>
              </tr>
            ) : (
              recipeItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="py-2.5 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <Scale className="h-3.5 w-3.5 text-slate-400" />
                      <span>{item.ingredients?.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 border-r border-slate-200/80 font-mono font-medium text-slate-900">
                    {Number(item.quantity_in_base_unit).toFixed(4)} {item.ingredients?.units?.name}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={isPending}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove Ingredient"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
        ingredientConversions={ingredientConversions}
      />
    </div>
  );
}
