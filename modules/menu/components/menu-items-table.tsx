"use client";

import { useState, useTransition, useMemo, Fragment } from "react";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Utensils,
  Tag,
  Percent,
  Layers,
  Sparkles,
  Check,
  X,
  Loader2,
  AlertCircle,
  FolderTree,
} from "lucide-react";
import { MenuItemDialog } from "./menu-item-dialog";
import { MenuVariantDialog } from "./variant-dialog";
import {
  deleteMenuItem,
  toggleMenuItemActive,
  toggleMenuVariantActive,
} from "../services/menu.actions";
import { Tooltip } from "@/shared/components/ui/tooltip";

interface MenuCategory {
  id: string;
  name: string;
}

interface TaxCategory {
  id: string;
  name: string;
  tax_rates?: { rate_percentage: number }[];
}

interface MenuVariant {
  id: string;
  menu_item_id: string;
  name: string;
  default_price: number;
  sku: string | null;
  serving_size: string | null;
  prep_time_mins: number | null;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string;
  tax_category_id: string | null;
  is_active: boolean;
  menu_categories?: { name: string };
  tax_categories?: { name: string; tax_rates?: { rate_percentage: number }[] };
}

interface Props {
  items: MenuItem[];
  categories: MenuCategory[];
  variants?: MenuVariant[];
  taxCategories: TaxCategory[];
  onOpenAdd?: () => void;
}

export function MenuItemsTable({
  items,
  categories,
  variants = [],
  taxCategories,
  onOpenAdd,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Expanded Items State (Accordion)
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  // Edit Item Dialog State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Add Variant Dialog State
  const [addVariantItemId, setAddVariantItemId] = useState<string | null>(null);

  // Toggle Accordion expansion
  const toggleExpand = (itemId: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchCat = item.menu_categories?.name.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }

      // Category
      if (selectedCategory !== "ALL" && item.category_id !== selectedCategory) {
        return false;
      }

      // Status
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;

      return true;
    });
  }, [items, search, selectedCategory, statusFilter]);

  // Group variants by menuItemId
  const variantsByItemId = useMemo(() => {
    const map = new Map<string, MenuVariant[]>();
    variants.forEach((v) => {
      const list = map.get(v.menu_item_id) || [];
      list.push(v);
      map.set(v.menu_item_id, list);
    });
    return map;
  }, [variants]);

  // Handle Quick Status Toggle
  const handleToggleItemStatus = (item: MenuItem) => {
    startTransition(async () => {
      await toggleMenuItemActive(item.id, !item.is_active);
    });
  };

  const handleToggleVariantStatus = (variant: MenuVariant) => {
    startTransition(async () => {
      await toggleMenuVariantActive(variant.id, !variant.is_active);
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", itemId);
      await deleteMenuItem(fd);
    });
  };

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden text-xs">
      {/* 1. Category Filter Pills Bar */}
      <div className="bg-slate-50/70 border-b border-slate-200/80 px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto select-none">
        <button
          type="button"
          onClick={() => setSelectedCategory("ALL")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            selectedCategory === "ALL"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
          }`}
        >
          <span>All Items</span>
          <span className={`text-[10px] font-mono ${selectedCategory === "ALL" ? "text-blue-100" : "text-slate-400"}`}>
            {items.length}
          </span>
        </button>

        {categories.map((cat) => {
          const count = items.filter((i) => i.category_id === cat.id).length;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isSelected
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
              }`}
            >
              <span>{cat.name}</span>
              <span className={`text-[10px] font-mono ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Search & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-3.5 py-2.5 border-b border-slate-200/80 bg-white">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter items by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 rounded-md border border-slate-200 bg-slate-50/50 pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50/50 p-0.5 text-[11px] font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                statusFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                statusFilter === "ACTIVE" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "hover:text-slate-900"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("INACTIVE")}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                statusFilter === "INACTIVE" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "hover:text-slate-900"
              }`}
            >
              Inactive
            </button>
          </div>

          {onOpenAdd && (
            <button
              type="button"
              onClick={onOpenAdd}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add item</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Items Master Table with Accordion Expansion */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/90 bg-slate-50/50 text-[11px] font-medium text-slate-500 select-none">
              <th className="py-2.5 px-3 border-r border-slate-200/80 w-[35%]">Dish / Product</th>
              <th className="py-2.5 px-3 border-r border-slate-200/80 w-[18%]">Category</th>
              <th className="py-2.5 px-3 border-r border-slate-200/80 w-[22%]">Variants & Pricing</th>
              <th className="py-2.5 px-3 border-r border-slate-200/80 w-[11%]">Tax</th>
              <th className="py-2.5 px-3 border-r border-slate-200/80 w-[8%] text-center">Status</th>
              <th className="py-2.5 px-3 text-right w-[6%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs text-slate-800 font-normal">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <FolderTree className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-600">No menu items match your filter</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {search ? "Try clearing your search query" : "Click 'Add Item' to start building your catalog"}
                  </p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const itemVariants = variantsByItemId.get(item.id) || [];
                const isExpanded = expandedItemIds.has(item.id);

                // Price range summary (e.g. "₹40 – ₹70")
                const prices = itemVariants.map((v) => Number(v.default_price));
                const minPrice = prices.length > 0 ? Math.min(...prices) : null;
                const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
                const priceLabel =
                  minPrice !== null && maxPrice !== null
                    ? minPrice === maxPrice
                      ? `₹${minPrice.toFixed(0)}`
                      : `₹${minPrice.toFixed(0)} – ₹${maxPrice.toFixed(0)}`
                    : "No price set";

                const taxRate = item.tax_categories?.tax_rates?.[0]?.rate_percentage;

                return (
                  <Fragment key={item.id}>
                    {/* Main Row */}
                    <tr
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isExpanded ? "bg-blue-50/20 border-b border-blue-100" : ""
                      }`}
                    >
                      {/* Dish / Name */}
                      <td className="py-2.5 px-3 border-r border-slate-200/80">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors mt-0.5 cursor-pointer"
                            title={isExpanded ? "Collapse variants" : "Expand variants"}
                          >
                            <ChevronRight
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                isExpanded ? "rotate-90 text-blue-600" : ""
                              }`}
                            />
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{item.name}</span>
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 border-r border-slate-200/80">
                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                          <Tag className="h-3 w-3 text-slate-400" />
                          <span>{item.menu_categories?.name || "Uncategorized"}</span>
                        </span>
                      </td>

                      {/* Variants & Pricing */}
                      <td className="py-2.5 px-3 border-r border-slate-200/80 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="flex items-center gap-2 hover:bg-slate-100 px-1.5 py-0.5 rounded transition-colors text-left cursor-pointer group-hover:text-blue-600"
                        >
                          <span className="font-semibold text-slate-900">{priceLabel}</span>
                          <span className="font-sans text-[10px] text-slate-400">
                            ({itemVariants.length} {itemVariants.length === 1 ? "size" : "sizes"})
                          </span>
                        </button>
                      </td>

                      {/* Tax */}
                      <td className="py-2.5 px-3 border-r border-slate-200/80 text-[11px] text-slate-600">
                        {taxRate !== undefined && taxRate > 0 ? (
                          <span className="inline-flex items-center gap-0.5 font-medium text-slate-700 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200/50">
                            <Percent className="h-2.5 w-2.5 text-slate-400" />
                            <span>{taxRate}% GST</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">0% Exempt</span>
                        )}
                      </td>

                      {/* Status Toggle (1-click active switch) */}
                      <td className="py-2.5 px-3 border-r border-slate-200/80 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleItemStatus(item)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                            item.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200/70"
                          }`}
                          title="Click to toggle status"
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/menu/items/${item.id}`}
                            className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="View Full Item Details & Variants"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsEditDialogOpen(true);
                            }}
                            className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Sub-row: Inline Expandable Variants & Recipe Summary */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 border-b border-slate-200">
                        <td colSpan={6} className="p-3 pl-8">
                          <div className="rounded-md border border-slate-200 bg-white p-3 space-y-2.5 shadow-2xs animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                                <Layers className="h-3.5 w-3.5 text-blue-600" />
                                <span>Sizes & Variants for {item.name}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setAddVariantItemId(item.id)}
                                className="flex items-center gap-1 rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium hover:bg-blue-100 transition-colors border border-blue-200/60 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add size / variant</span>
                              </button>
                            </div>

                            {itemVariants.length === 0 ? (
                              <p className="text-[11px] text-slate-400 py-2">
                                No variants configured for this dish yet. Click '+ Add size / variant' to define pricing and recipe.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 font-medium">
                                      <th className="py-1.5 px-3">Size / Variant</th>
                                      <th className="py-1.5 px-3 font-mono">Price</th>
                                      <th className="py-1.5 px-3">Serving Size</th>
                                      <th className="py-1.5 px-3 font-mono">SKU</th>
                                      <th className="py-1.5 px-3 text-center">Status</th>
                                      <th className="py-1.5 px-3 text-right">Recipe & Cost</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {itemVariants.map((v) => (
                                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-2 px-3 font-semibold text-slate-900">
                                          {v.name}
                                        </td>
                                        <td className="py-2 px-3 font-mono font-medium text-slate-900">
                                          ₹{Number(v.default_price).toFixed(2)}
                                        </td>
                                        <td className="py-2 px-3 text-slate-500">
                                          {v.serving_size || "—"}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-slate-400">
                                          {v.sku || "—"}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleVariantStatus(v)}
                                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold transition-colors cursor-pointer ${
                                              v.is_active
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                                : "bg-slate-100 text-slate-400"
                                            }`}
                                          >
                                            {v.is_active ? "Active" : "Off"}
                                          </button>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <Link
                                            href={`/menu/variants/${v.id}`}
                                            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                                          >
                                            <span>Configure Recipe</span>
                                            <ExternalLink className="h-3 w-3" />
                                          </Link>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Item Dialog */}
      <MenuItemDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        item={editingItem}
        categories={categories}
        taxCategories={taxCategories}
      />

      {/* Add Variant Dialog */}
      {addVariantItemId && (
        <MenuVariantDialog
          open={!!addVariantItemId}
          onOpenChange={(open) => !open && setAddVariantItemId(null)}
          menuItemId={addVariantItemId}
        />
      )}
    </div>
  );
}
