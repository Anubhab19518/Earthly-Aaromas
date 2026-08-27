"use client";

import { useTransition, useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, SlidersHorizontal, ArrowRightLeft, Sparkles, Scale, Info } from "lucide-react";
import { createStockAdjustment } from "@/modules/inventory/services/inventory.actions";
import { StockAdjustmentFormValues, stockAdjustmentFormSchema } from "@/modules/inventory/schemas/inventory.schema";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { InventorySnapshot } from "@/modules/inventory/schemas/inventory.schema";

interface StockAdjustmentDialogProps {
  ingredients: Ingredient[];
  locations: Location[];
  units: Unit[];
  conversions?: IngredientUnitConversion[];
  initialSnapshot?: InventorySnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockAdjustmentDialog({
  ingredients,
  locations,
  units,
  conversions = [],
  initialSnapshot,
  open,
  onOpenChange,
}: StockAdjustmentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: {
      location_id: "",
      ingredient_id: "",
      unit_id: "",
      reason: "ADJUSTMENT",
      quantity_change: 0,
      remarks: "",
    },
  });

  const selectedIngredientId = form.watch("ingredient_id");
  const selectedUnitId = form.watch("unit_id");
  const enteredQty = form.watch("quantity_change");

  const selectedIngredient = useMemo(
    () => ingredients.find((i) => i.id === selectedIngredientId),
    [ingredients, selectedIngredientId]
  );

  const baseUnit = useMemo(
    () => (selectedIngredient ? units.find((u) => u.id === selectedIngredient.base_unit_id) : null),
    [units, selectedIngredient]
  );

  // All available units for the selected ingredient: Base unit + Any configured conversions
  const availableUnits = useMemo(() => {
    if (!selectedIngredient || !baseUnit) return [];

    const list: { id: string; name: string; symbol: string; factor: number; isBase: boolean }[] = [
      {
        id: baseUnit.id,
        name: baseUnit.name,
        symbol: baseUnit.symbol,
        factor: 1,
        isBase: true,
      },
    ];

    const ingredientConversions = conversions.filter(
      (c) => c.ingredient_id === selectedIngredient.id && c.deleted_at === null
    );

    ingredientConversions.forEach((c) => {
      const fromUnit = units.find((u) => u.id === c.from_unit_id);
      if (fromUnit && !list.some((item) => item.id === fromUnit.id)) {
        list.push({
          id: fromUnit.id,
          name: fromUnit.name,
          symbol: fromUnit.symbol,
          factor: Number(c.conversion_factor),
          isBase: false,
        });
      }
    });

    return list;
  }, [selectedIngredient, baseUnit, conversions, units]);

  // Selected unit details & conversion calculation
  const activeUnitInfo = useMemo(() => {
    return availableUnits.find((u) => u.id === selectedUnitId) || availableUnits[0] || null;
  }, [availableUnits, selectedUnitId]);

  const convertedBaseQuantity = useMemo(() => {
    if (!activeUnitInfo || isNaN(Number(enteredQty))) return null;
    return Number(enteredQty) * activeUnitInfo.factor;
  }, [enteredQty, activeUnitInfo]);

  // Reset or initialize on open or when initialSnapshot is passed
  useEffect(() => {
    if (open) {
      const initialLocation = initialSnapshot?.location_id || locations[0]?.id || "";
      const initialIngredient = initialSnapshot?.ingredient_id || ingredients[0]?.id || "";
      const targetIng = ingredients.find((i) => i.id === initialIngredient);
      const defaultUnit = targetIng?.base_unit_id || "";

      form.reset({
        location_id: initialLocation,
        ingredient_id: initialIngredient,
        unit_id: defaultUnit,
        reason: "ADJUSTMENT",
        quantity_change: 0,
        remarks: "",
      });
      setErrorMsg(null);
    }
  }, [open, initialSnapshot, locations, ingredients, form]);

  // When ingredient changes, default unit to its base unit
  useEffect(() => {
    if (selectedIngredient && (!selectedUnitId || !availableUnits.some((u) => u.id === selectedUnitId))) {
      form.setValue("unit_id", selectedIngredient.base_unit_id);
    }
  }, [selectedIngredient, selectedUnitId, availableUnits, form]);

  const onSubmit = (data: StockAdjustmentFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("location_id", data.location_id);
      formData.append("ingredient_id", data.ingredient_id);
      if (data.unit_id) formData.append("unit_id", data.unit_id);
      formData.append("reason", data.reason);
      formData.append("quantity_change", String(data.quantity_change));
      if (data.remarks && data.remarks.trim()) {
        formData.append("remarks", data.remarks.trim());
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-2xl animate-in zoom-in-95 duration-150 text-slate-800 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">Adjust Stock</h2>
              <p className="text-[11px] text-slate-500">Record manual inventory corrections or wastage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-3.5">
          {/* Location */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Location <span className="text-rose-500">*</span>
            </label>
            <select
              {...form.register("location_id")}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer font-sans"
            >
              <option value="">Select location</option>
              {locations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.location_types?.name ? `(${loc.location_types.name})` : ""}
                </option>
              ))}
            </select>
            {form.formState.errors.location_id && (
              <p className="text-[11px] font-medium text-rose-600">
                {form.formState.errors.location_id.message}
              </p>
            )}
          </div>

          {/* Ingredient */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Ingredient <span className="text-rose-500">*</span>
            </label>
            <select
              {...form.register("ingredient_id")}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer font-sans"
            >
              <option value="">Select ingredient</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} {ing.sku ? `(${ing.sku})` : ""}
                </option>
              ))}
            </select>
            {form.formState.errors.ingredient_id && (
              <p className="text-[11px] font-medium text-rose-600">
                {form.formState.errors.ingredient_id.message}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Reason <span className="text-rose-500">*</span>
            </label>
            <select
              {...form.register("reason")}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer font-sans"
            >
              <option value="ADJUSTMENT">General Adjustment / Physical Count Difference</option>
              <option value="OPENING_STOCK">Opening Stock Setup</option>
              <option value="DAMAGE">Damage / Spillage (Wastage)</option>
              <option value="EXPIRY">Expiry (Wastage)</option>
            </select>
          </div>

          {/* Quantity & Unit Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Quantity Change <span className="text-rose-500">*</span>
              </label>
              {baseUnit && (
                <span className="text-[11px] text-slate-400">
                  Base unit: <strong className="text-slate-600">{baseUnit.name} ({baseUnit.symbol})</strong>
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  step="any"
                  {...form.register("quantity_change", { valueAsNumber: true })}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  placeholder="e.g. +10 or -5"
                />
              </div>

              {/* Unit Selector (Configured units for this item) */}
              <div className="w-[140px] shrink-0">
                <select
                  {...form.register("unit_id")}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
                >
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.symbol} {u.isBase ? "(Base)" : `(×${u.factor})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.formState.errors.quantity_change && (
              <p className="text-[11px] font-medium text-rose-600">
                {form.formState.errors.quantity_change.message}
              </p>
            )}

            {/* Real-time Conversion Preview */}
            {activeUnitInfo && !activeUnitInfo.isBase && convertedBaseQuantity !== null && Number(enteredQty) !== 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-700">
                <Scale className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <span>
                  Converted stock movement: <strong>{convertedBaseQuantity.toLocaleString()} {baseUnit?.symbol}</strong> ({Number(enteredQty)} {activeUnitInfo.symbol} × {activeUnitInfo.factor})
                </span>
              </div>
            )}
            
            <p className="text-[10px] text-slate-400">
              💡 Use positive numbers (e.g. <span className="font-mono text-emerald-600">+10</span>) to add stock, or negative numbers (e.g. <span className="font-mono text-rose-600">-5</span>) to deduct.
            </p>
          </div>

          {/* Notes / Remarks */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Notes / remarks <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...form.register("remarks")}
              rows={2}
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none font-sans"
              placeholder="Reason details, batch notes, or count audit ref..."
            />
            {form.formState.errors.remarks && (
              <p className="text-[11px] font-medium text-rose-600">
                {form.formState.errors.remarks.message}
              </p>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-rose-600 bg-rose-50 p-2.5 rounded-md border border-rose-200">
              {errorMsg}
            </p>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedIngredient}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-2xs cursor-pointer"
            >
              {isPending ? "Posting..." : "Post adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
