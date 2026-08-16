"use client";

import { useState, useTransition, useEffect } from "react";
import {
  addGrnItem,
  updateGrnItem,
  deleteGrnItem,
} from "@/modules/receiving/services/grn.actions";
import { GoodsReceiptItem } from "@/modules/receiving/schemas/grn.schema";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { TaxCategory } from "@/modules/taxes/schemas/tax.schema";
import {
  PackageCheck,
  X,
  Loader2,
  AlertCircle,
  Scale,
  DollarSign,
  Trash2,
  Check,
  Sparkles,
} from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface GrnItemFormProps {
  grnId: string;
  ingredients: Ingredient[];
  conversions: IngredientUnitConversion[];
  units: Unit[];
  taxCategories: TaxCategory[];
  editItem?: GoodsReceiptItem;
  onClose: () => void;
}

export function GrnItemForm({
  grnId,
  ingredients,
  conversions,
  units,
  taxCategories,
  editItem,
  onClose,
}: GrnItemFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [ingredientId, setIngredientId] = useState(editItem?.ingredient_id || "");
  const [purchaseUnitId, setPurchaseUnitId] = useState(editItem?.purchase_unit_id || "");
  const [receivedQty, setReceivedQty] = useState(
    editItem ? String(editItem.received_quantity) : ""
  );
  const [unitCost, setUnitCost] = useState(editItem ? String(editItem.unit_cost) : "");
  const [taxCategoryId, setTaxCategoryId] = useState(editItem?.tax_category_id || "");

  const [previewBaseQty, setPreviewBaseQty] = useState<number | null>(null);

  const selectedIngredient = ingredients.find((i) => i.id === ingredientId);

  // Eligible purchase units: base unit + units with a conversion for this ingredient
  const eligibleUnits = selectedIngredient
    ? units.filter(
        (u) =>
          u.id === selectedIngredient.base_unit_id ||
          conversions.some(
            (c) => c.ingredient_id === selectedIngredient.id && c.from_unit_id === u.id
          )
      )
    : [];

  // When ingredient changes, default unit to base unit
  useEffect(() => {
    if (selectedIngredient && !purchaseUnitId) {
      setPurchaseUnitId(selectedIngredient.base_unit_id);
    }
  }, [selectedIngredient, purchaseUnitId]);

  // Live preview of converted base quantity
  useEffect(() => {
    const qty = Number(receivedQty);
    if (!ingredientId || !purchaseUnitId || !qty || qty <= 0 || !selectedIngredient) {
      setPreviewBaseQty(null);
      return;
    }

    if (purchaseUnitId === selectedIngredient.base_unit_id) {
      setPreviewBaseQty(qty);
      return;
    }

    const conv = conversions.find(
      (c) => c.ingredient_id === selectedIngredient.id && c.from_unit_id === purchaseUnitId
    );
    if (conv) {
      setPreviewBaseQty(qty * Number(conv.conversion_factor));
    } else {
      setPreviewBaseQty(null);
    }
  }, [ingredientId, purchaseUnitId, receivedQty, selectedIngredient, conversions]);

  const baseUnit = selectedIngredient
    ? units.find((u) => u.id === selectedIngredient.base_unit_id)
    : null;

  const lineTotal =
    Number(receivedQty) && Number(unitCost) ? Number(receivedQty) * Number(unitCost) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientId) {
      setErrorMsg("Please select an ingredient.");
      return;
    }
    if (!purchaseUnitId) {
      setErrorMsg("Please select a purchase unit.");
      return;
    }
    if (!receivedQty || isNaN(Number(receivedQty)) || Number(receivedQty) <= 0) {
      setErrorMsg("Please enter a valid received quantity.");
      return;
    }
    if (!unitCost || isNaN(Number(unitCost)) || Number(unitCost) < 0) {
      setErrorMsg("Please enter a valid unit cost.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const fd = new FormData();
      if (editItem) fd.append("id", editItem.id);
      fd.append("goods_receipt_id", grnId);
      fd.append("ingredient_id", ingredientId);
      fd.append("purchase_unit_id", purchaseUnitId);
      fd.append("received_quantity", receivedQty);
      fd.append("unit_cost", unitCost);
      if (taxCategoryId) fd.append("tax_category_id", taxCategoryId);

      const action = editItem ? updateGrnItem : addGrnItem;
      const result = await action(null, fd);

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
      const fd = new FormData();
      fd.append("id", editItem.id);
      fd.append("goods_receipt_id", grnId);
      const result = await deleteGrnItem(null, fd);
      if (result?.message) setErrorMsg(result.message);
      else onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-100 font-sans">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl relative border border-slate-200 text-xs">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Dialog Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
            <PackageCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 leading-tight">
              {editItem ? "Edit Received Item" : "Add Received Line Item"}
            </h2>
            <p className="text-[11px] text-slate-500">
              Record quantity delivered and purchase price
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Ingredient Select */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Raw Material / Ingredient <span className="text-rose-500">*</span>
            </label>
            <Select
              value={ingredientId}
              onValueChange={(val) => {
                setIngredientId(val);
                setPurchaseUnitId("");
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Select ingredient..." />
              </SelectTrigger>
              <SelectContent>
                {ingredients.map((i) => (
                  <SelectItem key={i.id} value={i.id} className="text-xs font-medium">
                    {i.name} {i.sku ? `(${i.sku})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Received Quantity & Purchase Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Received Qty <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="any"
                min="0.001"
                value={receivedQty}
                onChange={(e) => setReceivedQty(e.target.value)}
                placeholder="e.g. 50"
                className="h-8 text-xs font-mono"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Packaging Unit <span className="text-rose-500">*</span>
              </label>
              <Select
                value={purchaseUnitId}
                onValueChange={(val) => setPurchaseUnitId(val)}
                disabled={!ingredientId}
              >
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                  <SelectValue placeholder={ingredientId ? "Select unit..." : "Pick ingredient"} />
                </SelectTrigger>
                <SelectContent>
                  {eligibleUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name} ({u.symbol})
                      {u.id === selectedIngredient?.base_unit_id ? " [base]" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live Base Quantity Conversion Indicator */}
          {previewBaseQty !== null && baseUnit && (
            <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/70 px-2.5 py-1.5 rounded-md border border-blue-200/60 font-mono">
              <Scale className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>
                Converts to: <strong>{previewBaseQty.toFixed(3)} {baseUnit.symbol}</strong> inventory stock
              </span>
            </div>
          )}

          {/* Unit Cost & Tax Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Unit Cost (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="e.g. 400.00"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Applicable Tax
              </label>
              <Select
                value={taxCategoryId}
                onValueChange={(val) => setTaxCategoryId(val)}
              >
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="No Tax / Exempt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">No Tax / 0%</SelectItem>
                  {taxCategories.map((t) => {
                    const rate = (t as any)?.tax_rates?.[0]?.rate_percentage || 0;
                    return (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name} ({rate}%)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line Total Summary Preview */}
          {lineTotal > 0 && (
            <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-md bg-slate-50 border border-slate-200/60">
              <span className="text-slate-500">Line Subtotal:</span>
              <span className="font-mono font-bold text-blue-600">
                ₹{lineTotal.toFixed(2)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {editItem ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !ingredientId || !receivedQty || !unitCost}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <span>{editItem ? "Save item" : "Add item"}</span>
                    <Check className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
