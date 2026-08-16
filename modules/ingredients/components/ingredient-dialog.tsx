"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createIngredient,
  updateIngredient,
} from "@/modules/ingredients/services/ingredient.actions";
import {
  createIngredientSchema,
  CreateIngredientFormValues,
  Ingredient,
  IngredientCategory,
} from "@/modules/ingredients/schemas/ingredient.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { Package, X, Flame } from "lucide-react";

interface IngredientDialogProps {
  ingredient?: Ingredient;
  categories: IngredientCategory[];
  units: Unit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IngredientDialog({
  ingredient,
  categories,
  units,
  open,
  onOpenChange,
}: IngredientDialogProps) {
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
    const currentPurchaseUnitId = form.getValues("default_purchase_unit_id");
    if (currentPurchaseUnitId && selectedBaseUnit) {
      const currentPurchaseUnit = units.find((u) => u.id === currentPurchaseUnitId);
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

      if (data.default_purchase_unit_id)
        formData.append("default_purchase_unit_id", data.default_purchase_unit_id);
      if (data.min_stock !== undefined && data.min_stock !== null)
        formData.append("min_stock", String(data.min_stock));
      if (data.max_stock !== undefined && data.max_stock !== null)
        formData.append("max_stock", String(data.max_stock));
      if (data.standard_cost !== undefined && data.standard_cost !== null)
        formData.append("standard_cost", String(data.standard_cost));

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-2xl rounded-md border border-slate-200 bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {ingredient ? "Edit Ingredient Master" : "Add New Ingredient"}
              </h2>
              <p className="text-[11px] text-slate-500">
                Define master SKU, measurement units, standard cost, and thresholds
              </p>
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4 text-xs">
          {/* Section 1: General Info */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              General Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Ingredient Name *
                </label>
                <input
                  {...form.register("name")}
                  className="w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  placeholder="e.g., Whole Milk, Assam Black Tea"
                />
                {form.formState.errors.name && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  SKU Code *
                </label>
                <input
                  {...form.register("sku")}
                  className="w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 font-mono text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all uppercase"
                  placeholder="e.g., MLK-001, TEA-ASSAM"
                />
                {form.formState.errors.sku && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {form.formState.errors.sku.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Category *
              </label>
              <select
                {...form.register("category_id")}
                className="w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.category_id && (
                <p className="mt-1 text-[11px] text-rose-600">
                  {form.formState.errors.category_id.message}
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Unit of Measurement */}
          <div className="border-t border-slate-200/80 pt-3 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Unit of Measurement & Purchase
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Base Unit (Recipe & Inventory) *
                </label>
                <select
                  {...form.register("base_unit_id")}
                  className="w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                >
                  <option value="">Select base unit...</option>
                  {(["WEIGHT", "VOLUME", "COUNT", "COOKING"] as const).map((cat) => {
                    const catUnits = units.filter((u) => u.measurement_category === cat);
                    if (catUnits.length === 0) return null;
                    const catLabel =
                      cat === "WEIGHT"
                        ? "Weight Units"
                        : cat === "VOLUME"
                        ? "Volume Units"
                        : cat === "COUNT"
                        ? "Count Units"
                        : "Cooking Units";

                    return (
                      <optgroup key={cat} label={catLabel}>
                        {catUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.symbol})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                {form.formState.errors.base_unit_id && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {form.formState.errors.base_unit_id.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Default Purchase Unit
                </label>
                <select
                  {...form.register("default_purchase_unit_id")}
                  className="w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50"
                  disabled={!selectedBaseUnit}
                >
                  <option value="">Same as base unit...</option>
                  {(["WEIGHT", "VOLUME", "COUNT", "COOKING"] as const).map((cat) => {
                    const catUnits = units.filter((u) => u.measurement_category === cat);
                    if (catUnits.length === 0) return null;
                    const isMatchingCategory = selectedBaseUnit ? cat === selectedBaseUnit.measurement_category : true;
                    const catLabel =
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
                        label={`${catLabel}${isMatchingCategory ? " (Matching Base Unit)" : " — Incompatible Category"}`}
                      >
                        {catUnits.map((u) => {
                          const isDisabled = !isMatchingCategory || u.status === "INACTIVE";
                          return (
                            <option key={u.id} value={u.id} disabled={isDisabled}>
                              {u.name} ({u.symbol}) {!isMatchingCategory ? "— (Different Category)" : ""}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })}
                </select>
                {form.formState.errors.default_purchase_unit_id && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {form.formState.errors.default_purchase_unit_id.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Standard Cost & Stock Limits */}
          <div className="border-t border-slate-200/80 pt-3 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Standard Costing & Stock Thresholds
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Standard Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    {...form.register("standard_cost", { valueAsNumber: true })}
                    className="w-full rounded-md border border-slate-200/90 bg-white pl-6 pr-3 py-1.5 font-mono text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    placeholder="0.00"
                  />
                </div>
                {form.formState.errors.standard_cost && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {form.formState.errors.standard_cost.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Min Stock Level
                </label>
                <input
                  type="number"
                  step="any"
                  {...form.register("min_stock", { valueAsNumber: true })}
                  className="w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 font-mono text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  placeholder="e.g., 10"
                />
                {form.formState.errors.min_stock && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {form.formState.errors.min_stock.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Max Stock Level
                </label>
                <input
                  type="number"
                  step="any"
                  {...form.register("max_stock", { valueAsNumber: true })}
                  className="w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 font-mono text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  placeholder="e.g., 100"
                />
                {form.formState.errors.max_stock && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {form.formState.errors.max_stock.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Attributes & Status */}
          <div className="border-t border-slate-200/80 pt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Status *</label>
                <select
                  {...form.register("status")}
                  className="w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="is_perishable"
                    {...form.register("is_perishable")}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-amber-600" />
                    <span className="font-medium text-slate-700">Perishable Goods</span>
                  </div>
                </label>
                <p className="text-[10px] text-slate-400 ml-6">
                  Requires FEFO expiration tracking and prompt usage
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-3">
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
              className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
            >
              {isPending ? "Saving..." : ingredient ? "Save changes" : "Create ingredient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
