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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">{category ? "Edit Category" : "Add Category"}</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Name *</label>
            <input
              {...form.register("name")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
              placeholder="e.g., Dairy"
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Description</label>
            <textarea
              {...form.register("description")}
              rows={3}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
              placeholder="Optional description"
            />
          </div>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

