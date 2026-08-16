"use client";

import { useState } from "react";
import { Plus, Tag, Search, Edit2, Trash2, X, FolderTree } from "lucide-react";
import { CategoryDialog } from "./category-dialog";
import { deleteIngredientCategory } from "../services/ingredient.actions";

interface CategoriesClientProps {
  categories: any[];
}

export function CategoriesClient({ categories }: CategoriesClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleEdit = (category: any) => {
    setSelectedCategory(category);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedCategory(null);
    setIsDialogOpen(true);
  };

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) ||
      (cat.description && cat.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="rounded-md border border-slate-200/90 bg-white shadow-2xs overflow-hidden font-sans">
      {/* Category Section Toolbar */}
      <div className="flex flex-col gap-2 border-b border-slate-200/80 bg-slate-50/60 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700">
            <Tag className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Categories Master</h3>
            <p className="text-[11px] text-slate-500">
              {categories.length} organized categories for raw materials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category..."
              className="w-full rounded-md border border-slate-200/90 bg-white pl-8 pr-7 py-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add category</span>
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/90 bg-slate-50/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none">
              <th scope="col" className="py-2.5 px-4 border-r border-slate-200/70 w-[30%]">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Category Name</span>
                </div>
              </th>
              <th scope="col" className="py-2.5 px-4 border-r border-slate-200/70 w-[55%]">
                <span>Description</span>
              </th>
              <th scope="col" className="py-2.5 px-4 text-right w-[15%]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 text-xs font-normal text-slate-800">
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <FolderTree className="h-7 w-7 text-slate-300" />
                    <p className="text-xs font-medium text-slate-600">No categories found</p>
                    <p className="text-[11px] text-slate-400">
                      Create your first category to group raw materials cleanly.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCategories.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-slate-200/70 hover:bg-slate-50/70 transition-colors group"
                >
                  <td className="py-2.5 px-4 border-r border-slate-200/70 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                        <Tag className="h-3 w-3" />
                        <span>{category.name}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 border-r border-slate-200/70 text-slate-600 text-xs">
                    {category.description || <span className="text-slate-400 italic">No description provided</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(category)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <form
                        action={async (formData) => {
                          await deleteIngredientCategory(null, formData);
                        }}
                        className="inline"
                      >
                        <input type="hidden" name="id" value={category.id} />
                        <button
                          type="submit"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Category"
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

      <CategoryDialog
        category={selectedCategory}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
