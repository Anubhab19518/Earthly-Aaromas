"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, ExternalLink } from "lucide-react";
import { MenuVariantDialog } from "./variant-dialog";
import { deleteMenuVariant } from "../services/menu.actions";

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

  const handleEdit = (variant: MenuVariant) => {
    setEditingVariant(variant);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingVariant(null);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm mt-6">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Menu Variants</h2>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a4f20]"
        >
          <Plus className="h-4 w-4" />
          Add Variant
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-6 py-3 font-medium">Variant Name</th>
              <th className="px-6 py-3 font-medium">Default Price</th>
              <th className="px-6 py-3 font-medium">SKU</th>
              <th className="px-6 py-3 font-medium">Serving Size</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {variants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                  No variants found. Add a variant to start building recipes.
                </td>
              </tr>
            ) : (
              variants.map((variant) => (
                <tr key={variant.id} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-4 font-medium text-zinc-900">
                    <Link href={`/menu/variants/${variant.id}`} className="hover:underline flex items-center gap-2">
                      {variant.name}
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    ₹{Number(variant.default_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">{variant.sku || "-"}</td>
                  <td className="px-6 py-4 text-zinc-600">{variant.serving_size || "-"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        variant.is_active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {variant.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEdit(variant)}
                        className="text-zinc-400 hover:text-zinc-900"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <form action={(fd) => { deleteMenuVariant(fd); }}>
                        <input type="hidden" name="id" value={variant.id} />
                        <input type="hidden" name="menu_item_id" value={menuItemId} />
                        <button
                          type="submit"
                          className="text-red-400 hover:text-red-600"
                          title="Delete"
                          onClick={(e) => {
                            if (!confirm("Are you sure you want to delete this variant?")) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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

