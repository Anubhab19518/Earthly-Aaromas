"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Layers,
  X,
  Loader2,
  AlertCircle,
  DollarSign,
  Clock,
  Barcode,
  Check,
} from "lucide-react";
import { createMenuVariant, updateMenuVariant } from "../services/menu.actions";
import { Input } from "@/shared/components/ui/input";

interface MenuVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItemId: string;
  variant?: {
    id: string;
    menu_item_id: string;
    name: string;
    default_price: number;
    sku: string | null;
    serving_size: string | null;
    prep_time_mins: number | null;
    is_active: boolean;
  } | null;
}

export function MenuVariantDialog({
  open,
  onOpenChange,
  menuItemId,
  variant,
}: MenuVariantDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [sku, setSku] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [prepTimeMins, setPrepTimeMins] = useState("");
  const [isActive, setIsActive] = useState(true);

  const isEditing = !!variant;

  useEffect(() => {
    if (open) {
      if (variant) {
        setName(variant.name);
        setDefaultPrice(String(variant.default_price));
        setSku(variant.sku || "");
        setServingSize(variant.serving_size || "");
        setPrepTimeMins(variant.prep_time_mins !== null ? String(variant.prep_time_mins) : "");
        setIsActive(variant.is_active);
      } else {
        setName("");
        setDefaultPrice("");
        setSku("");
        setServingSize("");
        setPrepTimeMins("");
        setIsActive(true);
      }
      setErrorMsg(null);
    }
  }, [open, variant, menuItemId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter a variant name (e.g., Regular, Large).");
      return;
    }
    if (!defaultPrice || isNaN(Number(defaultPrice)) || Number(defaultPrice) < 0) {
      setErrorMsg("Please enter a valid price (₹).");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const fd = new FormData();
      fd.append("menu_item_id", menuItemId);
      fd.append("name", name.trim());
      fd.append("default_price", defaultPrice.trim());
      if (sku.trim()) fd.append("sku", sku.trim());
      if (servingSize.trim()) fd.append("serving_size", servingSize.trim());
      if (prepTimeMins.trim()) fd.append("prep_time_mins", prepTimeMins.trim());
      fd.append("is_active", String(isActive));

      if (isEditing) {
        fd.append("id", variant.id);
        const result = await updateMenuVariant(null, fd);
        if (result?.message) setErrorMsg(result.message);
        else onOpenChange(false);
      } else {
        const result = await createMenuVariant(null, fd);
        if (result?.message) setErrorMsg(result.message);
        else onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-100 font-sans">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl relative border border-slate-200 text-xs">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 leading-tight">
              {isEditing ? "Edit Size / Variant" : "Add Size / Variant"}
            </h2>
            <p className="text-[11px] text-slate-500">
              Define pricing and serving configuration
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
          {/* Variant Name & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Size / Variant Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Regular, Large"
                className="h-8 text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Price (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                placeholder="e.g. 50"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* SKU & Serving Size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                SKU / Barcode (Optional)
              </label>
              <Input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. CHAI-REG"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Serving Size (Optional)
              </label>
              <Input
                type="text"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                placeholder="e.g. 250ml, 1 Pc"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Prep Time */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Prep Time in Mins (Optional)
            </label>
            <Input
              type="number"
              min="0"
              value={prepTimeMins}
              onChange={(e) => setPrepTimeMins(e.target.value)}
              placeholder="e.g. 5"
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* Active Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_var_check"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="is_active_var_check" className="text-xs text-slate-700 cursor-pointer select-none">
              Available on POS registers
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <span>{isEditing ? "Save changes" : "Add variant"}</span>
                  <Check className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
