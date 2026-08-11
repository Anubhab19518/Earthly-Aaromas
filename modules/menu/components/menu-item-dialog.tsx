"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMenuItem, updateMenuItem } from "../services/menu.actions";
import { menuItemSchema, MenuItemFormValues } from "../schemas/menu.schema";

interface MenuCategory {
  id: string;
  name: string;
}

interface TaxCategory {
  id: string;
  name: string;
  rate: number;
}

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MenuCategory[];
  taxCategories: TaxCategory[];
  item?: {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    tax_category_id: string | null;
    is_active: boolean;
  } | null;
}

export function MenuItemDialog({ open, onOpenChange, categories, taxCategories, item }: MenuItemDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema) as any,
    defaultValues: {
      category_id: "",
      name: "",
      description: "",
      image_url: "",
      tax_category_id: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          category_id: item.category_id,
          name: item.name,
          description: item.description || "",
          image_url: item.image_url || "",
          tax_category_id: item.tax_category_id || "",
          is_active: item.is_active,
        });
      } else {
        form.reset({
          category_id: "",
          name: "",
          description: "",
          image_url: "",
          tax_category_id: "",
          is_active: true,
        });
      }
      setErrorMsg(null);
    }
  }, [open, item, form]);

  const onSubmit = (data: MenuItemFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("category_id", data.category_id);
      formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);
      if (data.image_url) formData.append("image_url", data.image_url);
      if (data.tax_category_id) formData.append("tax_category_id", data.tax_category_id);
      formData.append("is_active", String(data.is_active));

      if (item) {
        formData.append("id", item.id);
        const result = await updateMenuItem(null, formData);
        if (result?.message) setErrorMsg(result.message);
        else onOpenChange(false);
      } else {
        const result = await createMenuItem(null, formData);
        if (result?.message) setErrorMsg(result.message);
        else onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">{item ? "Edit Menu Item" : "Add Menu Item"}</h2>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="mt-4 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-zinc-700">Category *</label>
            <select
              {...form.register("category_id")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {form.formState.errors.category_id && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.category_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Name *</label>
            <input
              {...form.register("name")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
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
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            />
            {form.formState.errors.description && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Tax Category</label>
            <select
              {...form.register("tax_category_id")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="">No Tax (or Inherit)</option>
              {taxCategories.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Image URL</label>
            <input
              {...form.register("image_url")}
              placeholder="https://..."
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            />
            {form.formState.errors.image_url && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.image_url.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_item"
              {...form.register("is_active")}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-[#4a632a]"
            />
            <label htmlFor="is_active_item" className="text-sm font-medium text-zinc-700">
              Active Item
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
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

