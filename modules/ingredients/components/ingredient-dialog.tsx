"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createIngredient, updateIngredient } from "@/modules/ingredients/services/ingredient.actions";
import { createIngredientSchema, CreateIngredientFormValues, Ingredient, IngredientCategory } from "@/modules/ingredients/schemas/ingredient.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";

interface IngredientDialogProps {
  ingredient?: Ingredient;
  categories: IngredientCategory[];
  units: Unit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IngredientDialog({ ingredient, categories, units, open, onOpenChange }: IngredientDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<CreateIngredientFormValues>({
    resolver: zodResolver(createIngredientSchema),
    defaultValues: {
      name: ingredient?.name || "",
      sku: ingredient?.sku || "",
      category_id: ingredient?.category_id || "",
      base_unit_id: ingredient?.base_unit_id || "",
      default_purchase_unit_id: ingredient?.default_purchase_unit_id || "",
      min_stock: ingredient?.min_stock || undefined,
      max_stock: ingredient?.max_stock || undefined,
      standard_cost: ingredient?.standard_cost || undefined,
      is_perishable: ingredient?.is_perishable || false,
      status: ingredient?.status || "ACTIVE",
    },
  });

  const selectedBaseUnitId = form.watch("base_unit_id");
  const selectedBaseUnit = units.find((u) => u.id === selectedBaseUnitId);
  
  // Valid purchase units must share the measurement category of the base unit
  const validPurchaseUnits = units.filter(
    (u) => selectedBaseUnit && u.measurement_category === selectedBaseUnit.measurement_category
  );

  useEffect(() => {
    if (open) {
      form.reset({
        name: ingredient?.name || "",
        sku: ingredient?.sku || "",
        category_id: ingredient?.category_id || "",
        base_unit_id: ingredient?.base_unit_id || "",
        default_purchase_unit_id: ingredient?.default_purchase_unit_id || "",
        min_stock: ingredient?.min_stock || undefined,
        max_stock: ingredient?.max_stock || undefined,
        standard_cost: ingredient?.standard_cost || undefined,
        is_perishable: ingredient?.is_perishable || false,
        status: ingredient?.status || "ACTIVE",
      });
      setErrorMsg(null);
    }
  }, [open, ingredient, form]);

  useEffect(() => {
    // If base unit changes and the current purchase unit is no longer valid, clear it
    const currentPurchaseUnitId = form.getValues("default_purchase_unit_id");
    if (currentPurchaseUnitId && selectedBaseUnit) {
      const currentPurchaseUnit = units.find(u => u.id === currentPurchaseUnitId);
      if (currentPurchaseUnit?.measurement_category !== selectedBaseUnit.measurement_category) {
        form.setValue("default_purchase_unit_id", "");
      }
    }
  }, [selectedBaseUnit, units, form]);

  const onSubmit = (data: CreateIngredientFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      
      const formData = new FormData();
      if (ingredient) formData.append("id", ingredient.id);
      formData.append("name", data.name);
      formData.append("sku", data.sku);
      formData.append("category_id", data.category_id);
      formData.append("base_unit_id", data.base_unit_id);
      
      if (data.default_purchase_unit_id) formData.append("default_purchase_unit_id", data.default_purchase_unit_id);
      if (data.min_stock !== undefined && data.min_stock !== null) formData.append("min_stock", String(data.min_stock));
      if (data.max_stock !== undefined && data.max_stock !== null) formData.append("max_stock", String(data.max_stock));
      if (data.standard_cost !== undefined && data.standard_cost !== null) formData.append("standard_cost", String(data.standard_cost));
      
      formData.append("is_perishable", String(data.is_perishable));
      formData.append("status", data.status);

      const result = ingredient 
        ? await updateIngredient(null, formData)
        : await createIngredient(null, formData);

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
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold">{ingredient ? "Edit Ingredient" : "Add Ingredient"}</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Name *</label>
              <input
                {...form.register("name")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                placeholder="e.g., Milk"
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">SKU *</label>
              <input
                {...form.register("sku")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                placeholder="e.g., MLK-01"
              />
              {form.formState.errors.sku && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.sku.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Category *</label>
            <select
              {...form.register("category_id")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {form.formState.errors.category_id && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.category_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Base Unit *</label>
              <select
                {...form.register("base_unit_id")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              >
                <option value="">Select base unit...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
              {form.formState.errors.base_unit_id && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.base_unit_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Default Purchase Unit</label>
              <select
                {...form.register("default_purchase_unit_id")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                disabled={!selectedBaseUnit}
              >
                <option value="">Select purchase unit...</option>
                {validPurchaseUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
              {form.formState.errors.default_purchase_unit_id && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.default_purchase_unit_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Standard Cost</label>
              <input
                type="number"
                step="any"
                {...form.register("standard_cost", { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
              {form.formState.errors.standard_cost && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.standard_cost.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Min Stock</label>
              <input
                type="number"
                step="any"
                {...form.register("min_stock", { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
              {form.formState.errors.min_stock && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.min_stock.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Max Stock</label>
              <input
                type="number"
                step="any"
                {...form.register("max_stock", { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
              {form.formState.errors.max_stock && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.max_stock.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_perishable"
              {...form.register("is_perishable")}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-[#4a632a]"
            />
            <label htmlFor="is_perishable" className="text-sm font-medium text-zinc-700">
              Perishable Ingredient
            </label>
          </div>

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

