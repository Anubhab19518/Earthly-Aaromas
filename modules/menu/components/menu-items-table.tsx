"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Search, ExternalLink } from "lucide-react";
import { MenuItemDialog } from "./menu-item-dialog";
import { deleteMenuItem } from "../services/menu.actions";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string;
  tax_category_id: string | null;
  is_active: boolean;
  menu_categories?: { name: string };
}

interface MenuCategory {
  id: string;
  name: string;
}

interface TaxCategory {
  id: string;
  name: string;
  rate: number;
}

interface Props {
  items: MenuItem[];
  categories: MenuCategory[];
  taxCategories: TaxCategory[];
}

export function MenuItemsTable({ items, categories, taxCategories }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [search, setSearch] = useState("");

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm mt-8">
      <div className="flex flex-col gap-4 border-b border-zinc-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Menu Items</h2>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 rounded-md border border-zinc-300 pl-9 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            />
          </div>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  No items found.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-4 font-medium text-zinc-900">
                    <Link href={`/menu/items/${item.id}`} className="hover:underline flex items-center gap-2">
                      {item.name}
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {item.menu_categories?.name || "-"}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 max-w-xs truncate">
                    {item.description || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        item.is_active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-zinc-400 hover:text-zinc-900"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <form action={(fd) => { deleteMenuItem(fd); }}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="text-red-400 hover:text-red-600"
                          title="Delete"
                          onClick={(e) => {
                            if (!confirm("Are you sure you want to delete this item?")) {
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

      <MenuItemDialog
        open={isDialogOpen}
        onOpenChange={handleClose}
        item={editingItem}
        categories={categories}
        taxCategories={taxCategories}
      />
    </div>
  );
}

