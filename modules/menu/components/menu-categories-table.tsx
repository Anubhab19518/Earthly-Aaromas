"use client";

import { useState, useTransition, useRef, useEffect, KeyboardEvent } from "react";
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  Loader2,
  AlertCircle,
  FolderTree,
  CornerDownLeft,
  Utensils,
} from "lucide-react";
import {
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
} from "../services/menu.actions";
import { Input } from "@/shared/components/ui/input";
import { Tooltip } from "@/shared/components/ui/tooltip";

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Props {
  categories: MenuCategory[];
  items?: any[];
}

export function MenuCategoriesTable({ categories, items = [] }: Props) {
  const [isPending, startTransition] = useTransition();

  // Search & Inline State
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Inline Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) setTimeout(() => addInputRef.current?.focus(), 50);
  }, [isAdding]);

  useEffect(() => {
    if (editingId) setTimeout(() => editInputRef.current?.focus(), 50);
  }, [editingId]);

  const getItemCount = (catId: string) => items.filter((i) => i.category_id === catId).length;

  const filteredCategories = categories.filter((cat) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return cat.name.toLowerCase().includes(q) || (cat.description && cat.description.toLowerCase().includes(q));
  });

  const resetAddForm = () => {
    setIsAdding(false);
    setAddName("");
    setAddDescription("");
    setErrorMsg(null);
  };

  const startEdit = (cat: MenuCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description || "");
    setDeletingId(null);
    setIsAdding(false);
    setErrorMsg(null);
  };

  const handleSaveAdd = () => {
    if (!addName.trim()) {
      setErrorMsg("Please enter a category name.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const fd = new FormData();
      fd.append("name", addName.trim());
      if (addDescription.trim()) fd.append("description", addDescription.trim());
      fd.append("is_active", "true");

      const result = await createMenuCategory(null, fd);
      if (result?.message) setErrorMsg(result.message);
      else resetAddForm();
    });
  };

  const handleSaveEdit = (catId: string) => {
    if (!editName.trim()) {
      setErrorMsg("Category name cannot be empty.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const fd = new FormData();
      fd.append("id", catId);
      fd.append("name", editName.trim());
      if (editDescription.trim()) fd.append("description", editDescription.trim());
      fd.append("is_active", "true");

      const result = await updateMenuCategory(null, fd);
      if (result?.message) setErrorMsg(result.message);
      else setEditingId(null);
    });
  };

  const handleConfirmDelete = (catId: string) => {
    startTransition(async () => {
      setErrorMsg(null);
      const fd = new FormData();
      fd.append("id", catId);
      const result = await deleteMenuCategory(fd);
      if (result?.message) setErrorMsg(result.message);
      else setDeletingId(null);
    });
  };

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden text-xs">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-4 py-3 border-b border-slate-200/80 bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-slate-900">Menu Categories</h3>
              <span className="flex h-4.5 px-1.5 items-center justify-center rounded text-[10px] font-mono font-medium bg-slate-200 text-slate-700">
                {categories.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Group dishes and beverages for POS terminals, digital boards, and printed menus
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full h-8 rounded-md border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
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

          {!isAdding && (
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
                setErrorMsg(null);
              }}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add category</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Categories Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-500 select-none">
              <th className="py-2.5 px-4 border-r border-slate-200/80 w-[30%]">Category name</th>
              <th className="py-2.5 px-4 border-r border-slate-200/80 w-[45%]">Description</th>
              <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]">Assigned dishes</th>
              <th className="py-2.5 px-4 text-right w-[10%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs text-slate-800 font-normal">
            {filteredCategories.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-slate-400">
                  <FolderTree className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-600">No categories found</p>
                </td>
              </tr>
            ) : (
              filteredCategories.map((category) => {
                const count = getItemCount(category.id);

                // INLINE EDIT ROW
                if (editingId === category.id) {
                  return (
                    <tr key={category.id} className="bg-blue-50/20 border-b border-blue-200">
                      <td colSpan={4} className="p-3 space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          <div className="sm:col-span-4">
                            <Input
                              ref={editInputRef}
                              variant="underline"
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-7 border-b-2 border-blue-500 focus:border-blue-700 text-xs font-semibold text-slate-900 bg-transparent px-1 py-0.5"
                              placeholder="Category name..."
                            />
                          </div>
                          <div className="sm:col-span-8">
                            <Input
                              variant="underline"
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="h-7 border-b-2 border-blue-500 focus:border-blue-700 text-xs font-normal text-slate-900 bg-transparent px-1 py-0.5"
                              placeholder="Description (optional)..."
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(category.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
                          >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            <span>Save changes</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // INLINE DELETE ROW
                if (deletingId === category.id) {
                  return (
                    <tr key={category.id} className="bg-rose-50/50">
                      <td colSpan={3} className="py-2.5 px-4 text-xs text-rose-800">
                        <span>Delete category <strong>{category.name}</strong>?</span>
                        {count > 0 && (
                          <span className="ml-2 text-rose-600 text-[11px]">
                            ({count} menu items are currently in this category)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(category.id)}
                            disabled={isPending}
                            className="rounded bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 cursor-pointer"
                          >
                            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // READ-ONLY ROW
                return (
                  <tr key={category.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-2.5 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                          <Tag className="h-3 w-3 text-blue-600" />
                          <span>{category.name}</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-4 border-r border-slate-200/80 text-slate-600 text-xs max-w-[280px]">
                      {category.description ? (
                        <Tooltip content={category.description}>
                          <span className="truncate block max-w-[280px] cursor-default text-slate-600">
                            {category.description}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 border-r border-slate-200/80 text-slate-700 font-mono">
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] bg-slate-100 text-slate-700 border border-slate-200/60">
                        {count} {count === 1 ? "dish" : "dishes"}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingId(category.id);
                            setEditingId(null);
                            setIsAdding(false);
                          }}
                          className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}

            {/* JIRA-STYLE INLINE ADD ROW */}
            {isAdding && (
              <tr className="bg-slate-50/40">
                <td colSpan={4} className="p-2.5">
                  <div className="rounded-md border border-blue-500 bg-white shadow-xs px-3 py-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <div className="flex items-center shrink-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-blue-600 border border-blue-200/60">
                          <Tag className="h-3.5 w-3.5" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-4">
                          <Input
                            ref={addInputRef}
                            variant="underline"
                            type="text"
                            placeholder="Category name (e.g. Hot Teas, Bakery)..."
                            value={addName}
                            onChange={(e) => {
                              setAddName(e.target.value);
                              setErrorMsg(null);
                            }}
                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveAdd();
                              } else if (e.key === "Escape") {
                                resetAddForm();
                              }
                            }}
                            className="h-7 border-b-2 border-blue-500 focus:border-blue-700 text-xs font-semibold text-slate-900 bg-transparent px-1 py-0.5"
                          />
                        </div>

                        <div className="sm:col-span-8">
                          <Input
                            variant="underline"
                            type="text"
                            placeholder="Description (optional)..."
                            value={addDescription}
                            onChange={(e) => setAddDescription(e.target.value)}
                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveAdd();
                              } else if (e.key === "Escape") {
                                resetAddForm();
                              }
                            }}
                            className="h-7 border-b-2 border-blue-500 focus:border-blue-700 text-xs font-normal text-slate-900 bg-transparent px-1 py-0.5"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 justify-end">
                        <button
                          type="button"
                          onClick={handleSaveAdd}
                          disabled={isPending || !addName.trim()}
                          className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-2xs"
                        >
                          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                            <>
                              <span>Create</span>
                              <CornerDownLeft className="h-3 w-3 opacity-70" />
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={resetAddForm}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {/* "+ Add category..." trigger row */}
            {!isAdding && (
              <tr
                onClick={() => {
                  setIsAdding(true);
                  setEditingId(null);
                  setErrorMsg(null);
                }}
                className="group border-t border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors"
              >
                <td colSpan={4} className="py-2.5 px-4 text-xs text-slate-500 group-hover:text-blue-600">
                  <div className="flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    <span>Add category...</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
