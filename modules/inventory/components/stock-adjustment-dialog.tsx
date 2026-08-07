"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Opening Stock / Stock Adjustment</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Manually adjust inventory. This will post directly to the immutable ledger.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Location *</label>
            <select
              {...form.register("location_id")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="">Select location...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            {form.formState.errors.location_id && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.location_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Ingredient *</label>
            <select
              {...form.register("ingredient_id")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="">Select ingredient...</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
            {form.formState.errors.ingredient_id && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.ingredient_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Reason *</label>
              <select
                {...form.register("reason")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
              >
                <option value="ADJUSTMENT">General Adjustment</option>
                <option value="OPENING_STOCK">Opening Stock</option>
                <option value="DAMAGE">Damage</option>
                <option value="EXPIRY">Expiry</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Quantity Change {baseUnit ? `(${baseUnit.symbol})` : ""} *
              </label>
              <input
                type="number"
                step="any"
                {...form.register("quantity_change", { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
                placeholder="Use - for deductions"
              />
              {form.formState.errors.quantity_change && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.quantity_change.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Notes / Remarks (Optional)</label>
            <textarea
              {...form.register("remarks")}
              rows={2}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
              placeholder="e.g., Found 2 extra boxes during stock take"
            />
            {form.formState.errors.remarks && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.remarks.message}</p>
            )}
          </div>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="mt-6 flex justify-end gap-3">
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
              disabled={isPending || !selectedIngredient}
              className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Posting..." : "Post Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

