"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { MenuCategoryDialog } from "./menu-category-dialog";
import { deleteMenuCategory } from "../services/menu.actions";

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Props {
  categories: MenuCategory[];
}

export function MenuCategoriesTable({ categories }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  const handleEdit = (category: MenuCategory) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Menu Categories</h2>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a4f20]"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                  No categories found.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-4 font-medium text-zinc-900">{category.name}</td>
                  <td className="px-6 py-4 text-zinc-600">{category.description || "-"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        category.is_active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-zinc-400 hover:text-zinc-900"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <form action={(fd) => { deleteMenuCategory(fd); }}>
                        <input type="hidden" name="id" value={category.id} />
                        <button
                          type="submit"
                          className="text-red-400 hover:text-red-600"
                          title="Delete"
                          onClick={(e) => {
                            if (!confirm("Are you sure you want to delete this category?")) {
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

      <MenuCategoryDialog
        open={isDialogOpen}
        onOpenChange={handleClose}
        category={editingCategory}
      />
    </div>
  );
}

