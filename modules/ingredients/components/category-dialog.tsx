"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createIngredientCategory,
  updateIngredientCategory,
} from "@/modules/ingredients/services/ingredient.actions";
import {
  createIngredientCategorySchema,
  CreateIngredientCategoryFormValues,
  IngredientCategory,
} from "@/modules/ingredients/schemas/ingredient.schema";
import { Tag, X } from "lucide-react";

interface CategoryDialogProps {
  category?: IngredientCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryDialog({ category, open, onOpenChange }: CategoryDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<CreateIngredientCategoryFormValues>({
    resolver: zodResolver(createIngredientCategorySchema),
    defaultValues: {
      name: category?.name || "",
      description: category?.description || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name || "",
        description: category?.description || "",
      });
      setErrorMsg(null);
    }
  }, [open, category, form]);

  const onSubmit = (data: CreateIngredientCategoryFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);

      const formData = new FormData();
      if (category) formData.append("id", category.id);
      formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);

      const result = category
        ? await updateIngredientCategory(null, formData)
        : await createIngredientCategory(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {category ? "Edit Category" : "Add New Category"}
              </h2>
              <p className="text-[11px] text-slate-500">Group raw materials by ingredient class</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Category Name *</label>
            <input
              {...form.register("name")}
              className="w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              placeholder="e.g., Dairy, Spices, Teas, Sweeteners"
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-[11px] text-rose-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description</label>
            <textarea
              {...form.register("description")}
              rows={3}
              className="w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              placeholder="Brief description of this ingredient grouping..."
            />
          </div>

          {errorMsg && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
            >
              {isPending ? "Saving..." : category ? "Save changes" : "Create category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
