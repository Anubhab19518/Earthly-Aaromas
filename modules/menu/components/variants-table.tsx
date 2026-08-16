"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, ExternalLink, Layers, ChefHat, Check } from "lucide-react";
import { MenuVariantDialog } from "./variant-dialog";
import { deleteMenuVariant, toggleMenuVariantActive } from "../services/menu.actions";

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

interface Props {
  menuItemId: string;
  variants: MenuVariant[];
}

export function VariantsTable({ menuItemId, variants }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<MenuVariant | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEdit = (variant: MenuVariant) => {
    setEditingVariant(variant);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingVariant(null);
  };

  const handleToggleStatus = (variant: MenuVariant) => {
    startTransition(async () => {
      await toggleMenuVariantActive(variant.id, !variant.is_active);
    });
  };

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden text-xs font-sans">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-slate-900">Configured Sizes & Variants</h2>
              <span className="flex h-4.5 px-1.5 items-center justify-center rounded text-[10px] font-mono font-medium bg-slate-200 text-slate-700">
                {variants.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Each variant can have independent recipes, base pricing, and branch availability
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Size / Variant</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-500 select-none">
              <th className="py-2.5 px-4 border-r border-slate-200/80">Variant name</th>
              <th className="py-2.5 px-4 border-r border-slate-200/80 font-mono">Default price</th>
              <th className="py-2.5 px-4 border-r border-slate-200/80 font-mono">SKU</th>
              <th className="py-2.5 px-4 border-r border-slate-200/80">Serving size</th>
              <th className="py-2.5 px-4 border-r border-slate-200/80 text-center">Status</th>
              <th className="py-2.5 px-4 text-right">Recipe & Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs text-slate-800">
            {variants.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  <Layers className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-600">No variants created yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click 'Add Size / Variant' to configure portion size and pricing
                  </p>
                </td>
              </tr>
            ) : (
              variants.map((variant) => (
                <tr key={variant.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="py-2.5 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                    <Link
                      href={`/menu/variants/${variant.id}`}
                      className="hover:underline flex items-center gap-1.5 text-slate-900 hover:text-blue-600 font-semibold"
                    >
                      <span>{variant.name}</span>
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 border-r border-slate-200/80 font-mono font-medium text-slate-900">
                    ₹{Number(variant.default_price).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 border-r border-slate-200/80 font-mono text-slate-500">
                    {variant.sku || "—"}
                  </td>
                  <td className="py-2.5 px-4 border-r border-slate-200/80 text-slate-600">
                    {variant.serving_size || "—"}
                  </td>
                  <td className="py-2.5 px-4 border-r border-slate-200/80 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(variant)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                        variant.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200/70"
                      }`}
                    >
                      {variant.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/menu/variants/${variant.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200/50"
                      >
                        <ChefHat className="h-3 w-3" />
                        <span>Recipe & Cost</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleEdit(variant)}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Variant"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <form action={(fd) => { deleteMenuVariant(fd); }}>
                        <input type="hidden" name="id" value={variant.id} />
                        <input type="hidden" name="menu_item_id" value={menuItemId} />
                        <button
                          type="submit"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Variant"
                          onClick={(e) => {
                            if (!confirm("Are you sure you want to delete this variant?")) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MenuVariantDialog
        open={isDialogOpen}
        onOpenChange={handleClose}
        menuItemId={menuItemId}
        variant={editingVariant}
      />
    </div>
  );
}
