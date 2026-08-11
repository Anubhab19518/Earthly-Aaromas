"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUnit, updateUnit } from "@/modules/units/services/unit.actions";
import { createUnitSchema, CreateUnitFormValues, Unit } from "@/modules/units/schemas/unit.schema";

interface UnitDialogProps {
  unit?: Unit;
  units: Unit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitDialog({ unit, units, open, onOpenChange }: UnitDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: {
      name: unit?.name || "",
      symbol: unit?.symbol || "",
      measurement_category: unit?.measurement_category || "WEIGHT",
      is_base_unit: unit?.is_base_unit || false,
      base_unit_id: unit?.base_unit_id || "",
      conversion_factor: unit?.conversion_factor || undefined,
      status: unit?.status || "ACTIVE",
    },
  });

  const isBaseUnit = form.watch("is_base_unit");
  const selectedCategory = form.watch("measurement_category");
  
  useEffect(() => {
    if (open) {
      form.reset({
        name: unit?.name || "",
        symbol: unit?.symbol || "",
        measurement_category: unit?.measurement_category || "WEIGHT",
        is_base_unit: unit?.is_base_unit || false,
        base_unit_id: unit?.base_unit_id || "",
        conversion_factor: unit?.conversion_factor || undefined,
        status: unit?.status || "ACTIVE",
      });
      setErrorMsg(null);
    }
  }, [open, unit, form]);

  useEffect(() => {
    if (isBaseUnit) {
      form.setValue("base_unit_id", "");
      form.setValue("conversion_factor", undefined);
    }
  }, [isBaseUnit, form]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = (data: any) => {
    startTransition(async () => {
      setErrorMsg(null);
      
      const formData = new FormData();
      if (unit) formData.append("id", unit.id);
      formData.append("name", data.name);
      formData.append("symbol", data.symbol);
      formData.append("measurement_category", data.measurement_category);
      formData.append("is_base_unit", String(data.is_base_unit));
      
      if (!data.is_base_unit) {
        if (data.base_unit_id) formData.append("base_unit_id", data.base_unit_id);
        if (data.conversion_factor) formData.append("conversion_factor", String(data.conversion_factor));
      }
      
      formData.append("status", data.status);

      const result = unit 
        ? await updateUnit(null, formData)
        : await createUnit(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  const validBaseUnits = units.filter(u => 
    u.is_base_unit && 
    u.measurement_category === selectedCategory && 
    u.id !== unit?.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold">{unit ? "Edit Unit" : "Add Unit"}</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Name *</label>
              <input
                {...form.register("name")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                placeholder="e.g., Kilogram"
              />
              {(form.formState.errors as any).name && (
                <p className="mt-1 text-sm text-red-600">{(form.formState.errors as any).name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Symbol *</label>
              <input
                {...form.register("symbol")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                placeholder="e.g., kg"
              />
              {(form.formState.errors as any).symbol && (
                <p className="mt-1 text-sm text-red-600">{(form.formState.errors as any).symbol.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Measurement Category *</label>
            <select
              {...form.register("measurement_category")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="WEIGHT">Weight</option>
              <option value="VOLUME">Volume</option>
              <option value="COUNT">Count</option>
              <option value="COOKING">Cooking</option>
            </select>
            {(form.formState.errors as any).measurement_category && (
              <p className="mt-1 text-sm text-red-600">{(form.formState.errors as any).measurement_category.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 pb-2">
            <input
              type="checkbox"
              id="is_base_unit"
              {...form.register("is_base_unit")}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-[#4a632a]"
            />
            <label htmlFor="is_base_unit" className="text-sm font-medium text-zinc-700">
              This is a Base Unit for its category
            </label>
          </div>

          {!isBaseUnit && (
            <div className="grid grid-cols-2 gap-4 rounded-md bg-zinc-50 p-4 border border-zinc-200">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Base Unit Reference *</label>
                <select
                  {...form.register("base_unit_id")}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                >
                  <option value="">Select base unit...</option>
                  {validBaseUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
                {(form.formState.errors as any).base_unit_id && (
                  <p className="mt-1 text-sm text-red-600">{(form.formState.errors as any).base_unit_id.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Conversion Factor *</label>
                <input
                  type="number"
                  step="any"
                  {...form.register("conversion_factor")}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                  placeholder="e.g., 1000"
                />
                <p className="mt-1 text-xs text-zinc-500">How many base units equal 1 {form.watch("name") || "of this"}?</p>
                {(form.formState.errors as any).conversion_factor && (
                  <p className="mt-1 text-sm text-red-600">{(form.formState.errors as any).conversion_factor.message}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700">Status *</label>
            <select
              {...form.register("status")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
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
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

