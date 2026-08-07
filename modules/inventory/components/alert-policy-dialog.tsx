"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAlertPolicy, updateAlertPolicy, deleteAlertPolicy } from "@/modules/inventory/services/alert-policy.actions";
import { CreateAlertPolicyFormValues, createAlertPolicySchema, InventoryAlertPolicy } from "@/modules/inventory/schemas/alert-policy.schema";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";

interface AlertPolicyDialogProps {
  ingredient: Ingredient;
  baseUnit: Unit;
  locations: Location[];
  policy?: InventoryAlertPolicy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlertPolicyDialog({ ingredient, baseUnit, locations, policy, open, onOpenChange }: AlertPolicyDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<CreateAlertPolicyFormValues>({
    resolver: zodResolver(createAlertPolicySchema),
    defaultValues: {
      location_id: policy?.location_id || "",
      ingredient_id: ingredient.id,
      warning_level: policy?.warning_level || 0,
      critical_level: policy?.critical_level || 0,
      out_of_stock_level: policy?.out_of_stock_level || 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        location_id: policy?.location_id || "",
        ingredient_id: ingredient.id,
        warning_level: policy?.warning_level || 0,
        critical_level: policy?.critical_level || 0,
        out_of_stock_level: policy?.out_of_stock_level || 0,
      });
      setErrorMsg(null);
    }
  }, [open, policy, ingredient, form]);

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

  const handleDelete = () => {
    if (!policy) return;
    if (!confirm("Are you sure you want to delete this alert policy?")) return;

    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", policy.id);
      const result = await deleteAlertPolicy(null, formData);
      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">{policy ? "Edit Alert Policy" : "Add Alert Policy"}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Ingredient: <span className="font-medium text-zinc-800">{ingredient.name}</span> <br/>
          Unit: <span className="font-medium text-zinc-800">{baseUnit.name} ({baseUnit.symbol})</span>
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {!policy && (
            <div>
              <label className="block text-sm font-medium text-zinc-700">Location *</label>
              <select
                {...form.register("location_id")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
              >
                <option value="">Select location...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.location_id && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.location_id.message}</p>
              )}
            </div>
          )}

          {policy && (
            <div>
              <label className="block text-sm font-medium text-zinc-700">Location</label>
              <div className="mt-1 block w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-700">
                {locations.find((l) => l.id === policy.location_id)?.name || "Unknown"}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700">Warning Level ({baseUnit.symbol}) *</label>
            <input
              type="number"
              step="any"
              {...form.register("warning_level", { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
            />
            {form.formState.errors.warning_level && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.warning_level.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Critical Level ({baseUnit.symbol}) *</label>
            <input
              type="number"
              step="any"
              {...form.register("critical_level", { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
            />
            {form.formState.errors.critical_level && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.critical_level.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Out of Stock Level ({baseUnit.symbol}) *</label>
            <input
              type="number"
              step="any"
              {...form.register("out_of_stock_level", { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
            />
            {form.formState.errors.out_of_stock_level && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.out_of_stock_level.message}</p>
            )}
          </div>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="mt-6 flex justify-between gap-3">
            {policy ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            ) : (
              <div></div>
            )}
            <div className="flex gap-3">
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
          </div>
        </form>
      </div>
    </div>
  );
}

