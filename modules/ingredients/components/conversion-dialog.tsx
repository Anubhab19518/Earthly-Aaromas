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

  // Offer all active units except the base unit itself
  // (cross-category conversions are now supported)
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            {conversion ? "Edit Conversion" : "Add Conversion"}
          </h2>
          <p className="text-sm text-zinc-500">
            Ingredient:{" "}
            <span className="font-medium text-zinc-800">{ingredient.name}</span>
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">From Unit *</label>
            <select
              {...form.register("from_unit_id")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="">Select unit...</option>
              {eligibleFromUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
            {eligibleFromUnits.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No other active units available. Add more units first.
              </p>
            )}
            {form.formState.errors.from_unit_id && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.from_unit_id.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">To Unit (Base)</label>
            <div className="mt-1 flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
              <span className="text-sm text-zinc-700">
                {baseUnit ? `${baseUnit.name} (${baseUnit.symbol})` : "—"}
              </span>
              <span className="ml-auto rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600">
                Base Unit · Read only
              </span>
            </div>
            <input type="hidden" {...form.register("to_unit_id")} />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Conversion Factor *
            </label>
            <input
              type="number"
              step="any"
              {...form.register("conversion_factor", {
                setValueAs: (v) => (v === "" || v === undefined ? undefined : Number(v)),
              })}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
              placeholder="e.g., 1000"
            />
            {form.watch("from_unit_id") && baseUnit && (
              <p className="mt-1 text-xs text-zinc-500">
                1{" "}
                {units.find((u) => u.id === form.watch("from_unit_id"))?.symbol ?? "unit"} ={" "}
                {form.watch("conversion_factor") || "?"} {baseUnit.symbol}
              </p>
            )}
            {form.formState.errors.conversion_factor && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.conversion_factor.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Notes</label>
            <input
              {...form.register("notes")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
              placeholder="e.g., Packed tightly"
            />
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
              disabled={isPending}
              className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

