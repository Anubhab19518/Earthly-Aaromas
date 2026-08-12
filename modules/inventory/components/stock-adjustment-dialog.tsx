"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, SlidersHorizontal } from "lucide-react";
import { createStockAdjustment } from "@/modules/inventory/services/inventory.actions";
import { StockAdjustmentFormValues, stockAdjustmentFormSchema } from "@/modules/inventory/schemas/inventory.schema";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";

interface StockAdjustmentDialogProps {
  ingredients: Ingredient[];
  locations: Location[];
  units: Unit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockAdjustmentDialog({ ingredients, locations, units, open, onOpenChange }: StockAdjustmentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: {
      location_id: "",
      ingredient_id: "",
      reason: "ADJUSTMENT",
      quantity_change: 0,
      remarks: "",
    },
  });

  const selectedIngredientId = form.watch("ingredient_id");
  const selectedIngredient = ingredients.find((i) => i.id === selectedIngredientId);
  const baseUnit = selectedIngredient ? units.find((u) => u.id === selectedIngredient.base_unit_id) : null;

  useEffect(() => {
    if (open) {
      form.reset({
        location_id: "",
        ingredient_id: "",
        reason: "ADJUSTMENT",
        quantity_change: 0,
        remarks: "",
      });
      setErrorMsg(null);
    }
  }, [open, form]);

  const onSubmit = (data: StockAdjustmentFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("location_id", data.location_id);
      formData.append("ingredient_id", data.ingredient_id);
      formData.append("reason", data.reason);
      formData.append("quantity_change", String(data.quantity_change));
      if (data.remarks) formData.append("remarks", data.remarks);

      const result = await createStockAdjustment(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-md border border-slate-200/90 bg-white shadow-xl animate-in zoom-in-95 duration-150 text-slate-800 font-sans">
        
        {/* Minimal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Adjust stock</h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Minimal Single-Column Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Location <span className="text-rose-500">*</span>
            </label>
            <select
              {...form.register("location_id")}
              className="w-full rounded-md border border-slate-200/90 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              <option value="">Select location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            {form.formState.errors.location_id && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">
                {form.formState.errors.location_id.message}
              </p>
            )}
          </div>

          {/* Ingredient */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ingredient <span className="text-rose-500">*</span>
            </label>
            <select
              {...form.register("ingredient_id")}
              className="w-full rounded-md border border-slate-200/90 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              <option value="">Select ingredient</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name}
                </option>
              ))}
            </select>
            {form.formState.errors.ingredient_id && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">
                {form.formState.errors.ingredient_id.message}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason <span className="text-rose-500">*</span>
            </label>
            <select
              {...form.register("reason")}
              className="w-full rounded-md border border-slate-200/90 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              <option value="ADJUSTMENT">General Adjustment</option>
              <option value="OPENING_STOCK">Opening Stock</option>
              <option value="DAMAGE">Damage</option>
              <option value="EXPIRY">Expiry</option>
            </select>
          </div>

          {/* Quantity Change */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quantity change {baseUnit ? `(${baseUnit.symbol})` : ""} <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              {...form.register("quantity_change", { valueAsNumber: true })}
              className="w-full rounded-md border border-slate-200/90 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all"
              placeholder="Use + for addition, - for deduction"
            />
            {form.formState.errors.quantity_change && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">
                {form.formState.errors.quantity_change.message}
              </p>
            )}
          </div>

          {/* Notes / Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Notes / remarks <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...form.register("remarks")}
              rows={2}
              className="w-full rounded-md border border-slate-200/90 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
              placeholder="Add optional context..."
            />
            {form.formState.errors.remarks && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">
                {form.formState.errors.remarks.message}
              </p>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-rose-600 bg-rose-50 p-2.5 rounded-md border border-rose-200">
              {errorMsg}
            </p>
          )}

          {/* Minimal Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-md border border-slate-200/80 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedIngredient}
              className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-2xs cursor-pointer"
            >
              {isPending ? "Posting..." : "Post adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
