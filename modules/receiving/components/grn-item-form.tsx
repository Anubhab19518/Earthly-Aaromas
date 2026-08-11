"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addGrnItem, updateGrnItem, deleteGrnItem } from "@/modules/receiving/services/grn.actions";
import { addGrnItemSchema, AddGrnItemFormValues, GoodsReceiptItem } from "@/modules/receiving/schemas/grn.schema";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { TaxCategory } from "@/modules/taxes/schemas/tax.schema";

interface GrnItemFormProps {
  grnId: string;
  ingredients: Ingredient[];
  conversions: IngredientUnitConversion[];
  units: Unit[];
  taxCategories: TaxCategory[];
  editItem?: GoodsReceiptItem;
  onClose: () => void;
}

export function GrnItemForm({ grnId, ingredients, conversions, units, taxCategories, editItem, onClose }: GrnItemFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewBaseQty, setPreviewBaseQty] = useState<number | null>(null);

  const form = useForm<AddGrnItemFormValues>({
    resolver: zodResolver(addGrnItemSchema),
    defaultValues: {
      goods_receipt_id: grnId,
      ingredient_id: editItem?.ingredient_id || "",
      purchase_unit_id: editItem?.purchase_unit_id || "",
      received_quantity: editItem?.received_quantity || 0,
      unit_cost: editItem?.unit_cost || 0,
      tax_category_id: editItem?.tax_category_id || null,
    },
  });

  const watchIngredient = form.watch("ingredient_id");
  const watchPurchaseUnit = form.watch("purchase_unit_id");
  const watchQuantity = form.watch("received_quantity");

  const selectedIngredient = ingredients.find((i) => i.id === watchIngredient);

  // Eligible purchase units: base unit + units that have a conversion for this ingredient
  const eligibleUnits = selectedIngredient
    ? units.filter(
        (u) =>
          u.id === selectedIngredient.base_unit_id ||
          conversions.some(
            (c) => c.ingredient_id === selectedIngredient.id && c.from_unit_id === u.id
          )
      )
    : [];

  // Live preview of converted base quantity (client-side only for UX; server re-validates)
  useEffect(() => {
    if (!watchIngredient || !watchPurchaseUnit || !watchQuantity || watchQuantity <= 0 || !selectedIngredient) {
      setPreviewBaseQty(null);
      return;
    }

    if (watchPurchaseUnit === selectedIngredient.base_unit_id) {
      setPreviewBaseQty(watchQuantity);
      return;
    }

    const conv = conversions.find(
      (c) => c.ingredient_id === selectedIngredient.id && c.from_unit_id === watchPurchaseUnit
    );
    if (conv) {
      setPreviewBaseQty(watchQuantity * Number(conv.conversion_factor));
    } else {
      setPreviewBaseQty(null);
    }
  }, [watchIngredient, watchPurchaseUnit, watchQuantity, selectedIngredient, conversions]);

  const baseUnit = selectedIngredient ? units.find((u) => u.id === selectedIngredient.base_unit_id) : null;

  const onSubmit = (data: AddGrnItemFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      if (editItem) formData.append("id", editItem.id);
      formData.append("goods_receipt_id", data.goods_receipt_id);
      formData.append("ingredient_id", data.ingredient_id);
      formData.append("purchase_unit_id", data.purchase_unit_id);
      formData.append("received_quantity", String(data.received_quantity));
      formData.append("unit_cost", String(data.unit_cost));
      if (data.tax_category_id) formData.append("tax_category_id", data.tax_category_id);

      const result = editItem
        ? await updateGrnItem(null, formData)
        : await addGrnItem(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onClose();
      }
    });
  };

  const handleDelete = () => {
    if (!editItem) return;
    if (!confirm("Remove this item from the GRN?")) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", editItem.id);
      formData.append("goods_receipt_id", grnId);
      const result = await deleteGrnItem(null, formData);
      if (result?.message) setErrorMsg(result.message);
      else onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">{editItem ? "Edit Item" : "Add Item"}</h2>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Ingredient *</label>
            <select
              {...form.register("ingredient_id")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="">Select ingredient...</option>
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            {form.formState.errors.ingredient_id && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.ingredient_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Purchase Unit *</label>
            <select
              {...form.register("purchase_unit_id")}
              disabled={!selectedIngredient}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a] disabled:bg-zinc-50"
            >
              <option value="">Select unit...</option>
              {eligibleUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol}){u.id === selectedIngredient?.base_unit_id ? " — Base Unit" : ""}
                </option>
              ))}
            </select>
            {form.formState.errors.purchase_unit_id && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.purchase_unit_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Received Qty *
              </label>
              <input
                type="number"
                step="any"
                {...form.register("received_quantity", { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
              {form.formState.errors.received_quantity && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.received_quantity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Base Qty (auto)
              </label>
              <div className="mt-1 flex h-[42px] items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700">
                {previewBaseQty != null
                  ? `${previewBaseQty} ${baseUnit?.symbol || ""}`
                  : <span className="text-zinc-400">—</span>
                }
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Unit Cost (₹) *</label>
              <input
                type="number"
                step="0.01"
                {...form.register("unit_cost", { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
              {form.formState.errors.unit_cost && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.unit_cost.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Tax Category</label>
              <select
                {...form.register("tax_category_id")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              >
                <option value="">No Tax</option>
                {taxCategories.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="flex justify-between pt-2">
            {editItem ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            ) : <div />}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
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
                {isPending ? "Saving..." : "Save Item"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

