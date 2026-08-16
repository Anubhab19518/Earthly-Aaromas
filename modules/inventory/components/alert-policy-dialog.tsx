"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAlertPolicy, updateAlertPolicy } from "@/modules/inventory/services/alert-policy.actions";
import { CreateAlertPolicyFormValues, createAlertPolicySchema, InventoryAlertPolicy } from "@/modules/inventory/schemas/alert-policy.schema";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { X } from "lucide-react";

interface AlertPolicyDialogProps {
  ingredient: Ingredient;
  baseUnit: Unit;
  locations: Location[];
  policy?: InventoryAlertPolicy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlertPolicyDialog({
  ingredient,
  baseUnit,
  locations,
  policy,
  open,
  onOpenChange,
}: AlertPolicyDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<CreateAlertPolicyFormValues>({
    resolver: zodResolver(createAlertPolicySchema),
    defaultValues: {
      location_id: policy?.location_id || "",
      ingredient_id: ingredient.id,
      warning_level: policy?.warning_level ?? 50,
      critical_level: policy?.critical_level ?? 20,
      out_of_stock_level: policy?.out_of_stock_level ?? 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        location_id: policy?.location_id || (locations[0]?.id ?? ""),
        ingredient_id: ingredient.id,
        warning_level: policy?.warning_level ?? 50,
        critical_level: policy?.critical_level ?? 20,
        out_of_stock_level: policy?.out_of_stock_level ?? 0,
      });
      setErrorMsg(null);
    }
  }, [open, policy, ingredient, locations, form]);

  const onSubmit = (data: CreateAlertPolicyFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      if (policy) formData.append("id", policy.id);
      formData.append("location_id", data.location_id);
      formData.append("ingredient_id", data.ingredient_id);
      formData.append("warning_level", String(data.warning_level));
      formData.append("critical_level", String(data.critical_level));
      formData.append("out_of_stock_level", String(data.out_of_stock_level));

      const result = policy
        ? await updateAlertPolicy(null, formData)
        : await createAlertPolicy(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  const selectedLocName = locations.find((l) => l.id === policy?.location_id)?.name || "Facility";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {policy ? "Edit Alert Policy" : "Add Alert Policy"}
            </h2>
            <p className="text-[11px] text-slate-500">
              {ingredient.name} ({baseUnit.symbol})
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Facility Location *</label>
            {!policy ? (
              <select
                {...form.register("location_id")}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer"
              >
                <option value="">Select location...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                {selectedLocName}
              </div>
            )}
            {form.formState.errors.location_id && (
              <p className="mt-1 text-[11px] text-rose-600">
                {form.formState.errors.location_id.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Warning Threshold ({baseUnit.symbol}) *</label>
            <input
              type="number"
              step="any"
              {...form.register("warning_level", {
                setValueAs: (v) => (v === "" || v === undefined ? undefined : Number(v)),
              })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
            {form.formState.errors.warning_level && (
              <p className="mt-1 text-[11px] text-rose-600">
                {form.formState.errors.warning_level.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Critical Threshold ({baseUnit.symbol}) *</label>
            <input
              type="number"
              step="any"
              {...form.register("critical_level", {
                setValueAs: (v) => (v === "" || v === undefined ? undefined : Number(v)),
              })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
            {form.formState.errors.critical_level && (
              <p className="mt-1 text-[11px] text-rose-600">
                {form.formState.errors.critical_level.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Stockout Threshold ({baseUnit.symbol}) *</label>
            <input
              type="number"
              step="any"
              {...form.register("out_of_stock_level", {
                setValueAs: (v) => (v === "" || v === undefined ? undefined : Number(v)),
              })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
            {form.formState.errors.out_of_stock_level && (
              <p className="mt-1 text-[11px] text-rose-600">
                {form.formState.errors.out_of_stock_level.message}
              </p>
            )}
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
              className="rounded-md bg-amber-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
            >
              {isPending ? "Saving..." : policy ? "Save Changes" : "Save Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
