"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ChefHat,
  X,
  Loader2,
  AlertCircle,
  Scale,
  Check,
} from "lucide-react";
import { addRecipeItem } from "../services/menu.actions";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface Ingredient {
  id: string;
  name: string;
  base_unit_id?: string;
}

interface Unit {
  id: string;
  name: string;
  measurement_category?: string;
}

interface IngredientConversion {
  ingredient_id: string;
  from_unit_id: string;
}

interface RecipeItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variantId: string;
  ingredients: Ingredient[];
  units: Unit[];
  ingredientConversions: IngredientConversion[];
}

export function RecipeItemDialog({
  open,
  onOpenChange,
  variantId,
  ingredients,
  units,
  ingredientConversions,
}: RecipeItemDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setSelectedIngredientId("");
      setQuantity("");
      setSelectedUnitId("");
    }
  }, [open]);

  const selectedIngredient = ingredients.find((i) => i.id === selectedIngredientId);

  // Filter units: base unit is always valid; plus any unit that has a configured conversion
  const filteredUnits = selectedIngredient
    ? units.filter((u) => {
        if (u.id === selectedIngredient.base_unit_id) return true;
        return ingredientConversions.some(
          (c) => c.ingredient_id === selectedIngredientId && c.from_unit_id === u.id
        );
      })
    : [];

  useEffect(() => {
    if (selectedIngredient?.base_unit_id) {
      setSelectedUnitId(selectedIngredient.base_unit_id);
    }
  }, [selectedIngredientId, selectedIngredient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredientId) {
      setErrorMsg("Please select an ingredient.");
      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setErrorMsg("Please enter a valid quantity greater than 0.");
      return;
    }
    if (!selectedUnitId) {
      setErrorMsg("Please select a unit.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const fd = new FormData();
      fd.append("variant_id", variantId);
      fd.append("ingredient_id", selectedIngredientId);
      fd.append("quantity", quantity);
      fd.append("unit_id", selectedUnitId);

      const result = await addRecipeItem(null, fd);
      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-100 font-sans">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl relative border border-slate-200 text-xs">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
            <ChefHat className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 leading-tight">
              Add Ingredient to Recipe
            </h2>
            <p className="text-[11px] text-slate-500">
              Configure component ingredient and portion quantity
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Ingredient Select */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Raw Material / Ingredient <span className="text-rose-500">*</span>
            </label>
            <Select
              value={selectedIngredientId}
              onValueChange={(val) => setSelectedIngredientId(val)}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Select raw material / ingredient..." />
              </SelectTrigger>
              <SelectContent>
                {ingredients.map((i) => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-medium">
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="any"
                min="0.0001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 0.015"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Portion Unit <span className="text-rose-500">*</span>
              </label>
              <Select
                value={selectedUnitId}
                onValueChange={(val) => setSelectedUnitId(val)}
                disabled={!selectedIngredientId}
              >
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                  <SelectValue
                    placeholder={
                      selectedIngredientId ? "Select unit..." : "Pick ingredient first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs font-medium">
                      {u.name}
                      {u.id === selectedIngredient?.base_unit_id ? " (base)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-[10px] text-slate-400">
            Portions are automatically converted and depleted from base inventory units upon POS order checkout.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedIngredientId || !quantity}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <span>Add to Recipe</span>
                  <Check className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
