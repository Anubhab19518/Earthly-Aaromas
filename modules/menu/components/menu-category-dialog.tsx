"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMenuCategory, updateMenuCategory } from "../services/menu.actions";
import { menuCategorySchema, MenuCategoryFormValues } from "../schemas/menu.schema";

interface MenuCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
  } | null;
}

export function MenuCategoryDialog({ open, onOpenChange, category }: MenuCategoryDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<MenuCategoryFormValues>({
    resolver: zodResolver(menuCategorySchema) as any,
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
          name: category.name,
          description: category.description || "",
          is_active: category.is_active,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          is_active: true,
        });
      }
      setErrorMsg(null);
    }
  }, [open, category, form]);

  const onSubmit = (data: MenuCategoryFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);
      formData.append("is_active", String(data.is_active));

      if (category) {
        formData.append("id", category.id);
        const result = await updateMenuCategory(null, formData);
        if (result?.message) setErrorMsg(result.message);
        else onOpenChange(false);
      } else {
        const result = await createMenuCategory(null, formData);
        if (result?.message) setErrorMsg(result.message);
        else onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">{category ? "Edit Category" : "Add Category"}</h2>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Name *</label>
            <input
              {...form.register("name")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Description</label>
            <textarea
              {...form.register("description")}
              rows={2}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
            />
            {form.formState.errors.description && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              {...form.register("is_active")}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-[#4a632a]"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-zinc-700">
              Active Category
            </label>
          </div>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="flex justify-end gap-3 pt-2">
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

