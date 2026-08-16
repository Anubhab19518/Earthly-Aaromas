"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createConversion,
  updateConversion,
} from "@/modules/ingredients/services/ingredient-conversion.actions";
import {
  createConversionSchema,
  CreateConversionFormValues,
  IngredientUnitConversion,
} from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { X } from "lucide-react";

interface ConversionDialogProps {
  ingredient: Ingredient;
  units: Unit[];
  conversion?: IngredientUnitConversion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConversionDialog({
  ingredient,
  units,
  conversion,
  open,
  onOpenChange,
}: ConversionDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const baseUnit = units.find((u) => u.id === ingredient.base_unit_id);

  // Offer active units except the base unit
  const eligibleFromUnits = units.filter(
    (u) => u.id !== ingredient.base_unit_id && u.status === "ACTIVE"
  );

  const form = useForm<CreateConversionFormValues>({
    resolver: zodResolver(createConversionSchema),
    defaultValues: {
      ingredient_id: ingredient.id,
      from_unit_id: conversion?.from_unit_id ?? "",
      to_unit_id: ingredient.base_unit_id,
      conversion_factor: conversion?.conversion_factor ?? (undefined as unknown as number),
      notes: conversion?.notes ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ingredient_id: ingredient.id,
        from_unit_id: conversion?.from_unit_id ?? "",
        to_unit_id: ingredient.base_unit_id,
        conversion_factor: conversion?.conversion_factor ?? (undefined as unknown as number),
        notes: conversion?.notes ?? "",
      });
      setErrorMsg(null);
    }
  }, [open, ingredient, conversion, form]);

  const onSubmit = (data: CreateConversionFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);

      const formData = new FormData();
      if (conversion) formData.append("id", conversion.id);
      formData.append("ingredient_id", data.ingredient_id);
      formData.append("from_unit_id", data.from_unit_id);
      formData.append("to_unit_id", data.to_unit_id);
      formData.append("conversion_factor", String(data.conversion_factor));
      if (data.notes) formData.append("notes", data.notes);

      const result = conversion
        ? await updateConversion(null, formData)
        : await createConversion(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {conversion ? "Edit Unit Conversion" : "Add Unit Conversion"}
            </h2>
            <p className="text-[11px] text-slate-500">
              Target: <span className="font-medium text-slate-700">{ingredient.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3.5 flex items-start gap-2 rounded-md border border-blue-200/80 bg-blue-50/70 p-2.5 text-xs text-blue-900">
          <div className="space-y-0.5">
            <p className="font-semibold text-blue-950">Unit Conversion Rules</p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Base unit for <strong>{ingredient.name}</strong> is{" "}
              <span className="font-semibold font-mono bg-blue-100 px-1 py-0.2 rounded text-[10px]">
                {baseUnit?.name} ({baseUnit?.symbol})
              </span>{" "}
              in <strong>{baseUnit?.measurement_category}</strong> category. Packaging units must match this category.
            </p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Packaging Unit *</label>
            <select
              {...form.register("from_unit_id")}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="">Select packaging unit...</option>
              {(["WEIGHT", "VOLUME", "COUNT", "COOKING"] as const).map((cat) => {
                const catUnits = units.filter((u) => u.measurement_category === cat);
                if (catUnits.length === 0) return null;
                const isMatchingCategory = baseUnit ? cat === baseUnit.measurement_category : true;
                const categoryLabel =
                  cat === "WEIGHT"
                    ? "Weight Units"
                    : cat === "VOLUME"
                    ? "Volume Units"
                    : cat === "COUNT"
                    ? "Count Units"
                    : "Cooking Units";

                return (
                  <optgroup
                    key={cat}
                    label={`${categoryLabel}${isMatchingCategory ? " (Matching Base Unit)" : " — Incompatible Category"}`}
                  >
                    {catUnits.map((u) => {
                      const isBaseUnit = baseUnit && u.id === baseUnit.id;
                      const isDisabled = !isMatchingCategory || isBaseUnit || u.status === "INACTIVE";

                      return (
                        <option key={u.id} value={u.id} disabled={isDisabled}>
                          {u.name} ({u.symbol}) {isBaseUnit ? "— (Base Unit)" : !isMatchingCategory ? "— (Different Category)" : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })}
            </select>
            {form.formState.errors.from_unit_id && (
              <p className="mt-1 text-[11px] text-rose-600">
                {form.formState.errors.from_unit_id.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">To Base Unit</label>
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              <span>{baseUnit ? `${baseUnit.name} (${baseUnit.symbol})` : "—"}</span>
              <span className="text-[10px] text-slate-400 font-mono">Base Unit</span>
            </div>
            <input type="hidden" {...form.register("to_unit_id")} />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Conversion Factor *
            </label>
            <input
              type="number"
              step="any"
              {...form.register("conversion_factor", {
                setValueAs: (v) => (v === "" || v === undefined ? undefined : Number(v)),
              })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              placeholder="e.g., 12"
            />
            {form.formState.errors.conversion_factor && (
              <p className="mt-1 text-[11px] text-rose-600">
                {form.formState.errors.conversion_factor.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Notes (Optional)</label>
            <input
              {...form.register("notes")}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              placeholder="e.g., 1 box contains 12 units"
            />
          </div>

          {errorMsg && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
            >
              {isPending ? "Saving..." : conversion ? "Save Changes" : "Create Conversion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
