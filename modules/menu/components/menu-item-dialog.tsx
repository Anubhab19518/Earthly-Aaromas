"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Utensils,
  X,
  Loader2,
  AlertCircle,
  Tag,
  DollarSign,
  Percent,
  Check,
} from "lucide-react";
import { createMenuItem, updateMenuItem } from "../services/menu.actions";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface MenuCategory {
  id: string;
  name: string;
}

interface TaxCategory {
  id: string;
  name: string;
  tax_rates?: { rate_percentage: number }[];
}

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MenuCategory[];
  taxCategories: TaxCategory[];
  item?: {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    tax_category_id: string | null;
    is_active: boolean;
  } | null;
}

export function MenuItemDialog({
  open,
  onOpenChange,
  categories,
  taxCategories,
  item,
}: MenuItemDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [taxCategoryId, setTaxCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Initial Variant Setup (for new items)
  const [defaultPrice, setDefaultPrice] = useState("");
  const [variantName, setVariantName] = useState("Regular");

  const isEditing = !!item;

  useEffect(() => {
    if (open) {
      if (item) {
        setName(item.name);
        setCategoryId(item.category_id);
        setDescription(item.description || "");
        setTaxCategoryId(item.tax_category_id || "");
        setIsActive(item.is_active);
        setDefaultPrice("");
      } else {
        setName("");
        setCategoryId(categories[0]?.id || "");
        setDescription("");
        setTaxCategoryId("");
        setIsActive(true);
        setDefaultPrice("");
        setVariantName("Regular");
      }
      setErrorMsg(null);
    }
  }, [open, item, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter an item name.");
      return;
    }
    if (!categoryId) {
      setErrorMsg("Please select a category.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      if (isEditing) formData.append("id", item.id);
      formData.append("name", name.trim());
      formData.append("category_id", categoryId);
      if (description.trim()) formData.append("description", description.trim());
      if (taxCategoryId) formData.append("tax_category_id", taxCategoryId);
      formData.append("is_active", String(isActive));

      if (!isEditing && defaultPrice.trim()) {
        formData.append("default_price", defaultPrice.trim());
        formData.append("variant_name", variantName.trim() || "Regular");
      }

      const action = isEditing ? updateMenuItem : createMenuItem;
      const result = await action(null, formData);
      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
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

        {/* Dialog Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
            <Utensils className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 leading-tight">
              {isEditing ? "Edit Menu Item" : "Create Menu Item"}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isEditing ? "Update dish catalog details" : "Add a new dish or beverage to your menu"}
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
          {/* 1. Item Name */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Item Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Masala Chai, Matcha Latte, Samosa..."
              className="h-8 text-xs"
              autoFocus
            />
          </div>

          {/* 2. Category Select */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Category <span className="text-rose-500">*</span>
            </label>
            <Select value={categoryId} onValueChange={(val) => setCategoryId(val)}>
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Base Variant & Price (Quick Setup for new items) */}
          {!isEditing && (
            <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                Initial Size & Pricing (Optional)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Serving / Size</label>
                  <Input
                    type="text"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    placeholder="Regular / 250ml"
                    className="h-7 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Base Price (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    placeholder="e.g. 40"
                    className="h-7 text-xs font-mono bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Tax Category */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Applicable Tax Category
            </label>
            <Select value={taxCategoryId} onValueChange={(val) => setTaxCategoryId(val)}>
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="No Tax / Exempt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">No Tax / 0%</SelectItem>
                {taxCategories.map((t) => {
                  const rate = t.tax_rates?.[0]?.rate_percentage || 0;
                  return (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name} ({rate}%)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Description */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Flavor notes, allergens, brewing style..."
              className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none font-sans"
            />
          </div>

          {/* 6. Active Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_check"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="is_active_check" className="text-xs text-slate-700 cursor-pointer select-none">
              Available for POS billing & online ordering
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
                  <span>{isEditing ? "Save changes" : "Create item"}</span>
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
