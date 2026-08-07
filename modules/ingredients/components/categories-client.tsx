"use client";

import { useState } from "react";
import { CategoryDialog } from "./category-dialog";
import { deleteIngredientCategory } from "../services/ingredient.actions";

interface CategoriesClientProps {
  categories: any[];
}

export function CategoriesClient({ categories }: CategoriesClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

  const handleEdit = (category: any) => {
    setSelectedCategory(category);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedCategory(null);
    setIsDialogOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <button
          onClick={handleAdd}
          className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#587333]"
        >
          Add Category
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Description</th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-zinc-500">
                  No categories found.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {category.description || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-[#587333] hover:text-[#4a632a]"
                      >
                        Edit
                      </button>
                      <form action={async (formData) => {
                        await deleteIngredientCategory(null, formData);
                      }}>
                        <input type="hidden" name="id" value={category.id} />
                        <button type="submit" className="text-red-600 hover:text-red-900">
                          Delete
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

      <CategoryDialog
        category={selectedCategory}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
