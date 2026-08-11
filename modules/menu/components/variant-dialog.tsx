"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMenuVariant, updateMenuVariant } from "../services/menu.actions";
import { menuVariantSchema, MenuVariantFormValues } from "../schemas/menu.schema";

interface MenuVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItemId: string;
  variant?: {
    id: string;
    menu_item_id: string;
    name: string;
    default_price: number;
    sku: string | null;
    serving_size: string | null;
    prep_time_mins: number | null;
    is_active: boolean;
  } | null;
}

export function MenuVariantDialog({ open, onOpenChange, menuItemId, variant }: MenuVariantDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<MenuVariantFormValues>({
    resolver: zodResolver(menuVariantSchema) as any,
    defaultValues: {
      menu_item_id: menuItemId,
      name: "",
      default_price: 0,
      sku: "",
      serving_size: "",
      prep_time_mins: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (variant) {
        form.reset({
          menu_item_id: variant.menu_item_id,
          name: variant.name,
          default_price: variant.default_price,
          sku: variant.sku || "",
          serving_size: variant.serving_size || "",
          prep_time_mins: variant.prep_time_mins,
          is_active: variant.is_active,
        });
      } else {
        form.reset({
          menu_item_id: menuItemId,
          name: "",
          default_price: 0,
          sku: "",
          serving_size: "",
          prep_time_mins: null,
          is_active: true,
        });
      }
      setErrorMsg(null);
    }
  }, [open, variant, menuItemId, form]);

  const onSubmit = (data: MenuVariantFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("menu_item_id", data.menu_item_id);
      formData.append("name", data.name);
      formData.append("default_price", String(data.default_price));
      if (data.sku) formData.append("sku", data.sku);
      if (data.serving_size) formData.append("serving_size", data.serving_size);
      if (data.prep_time_mins !== null && data.prep_time_mins !== undefined) {
        formData.append("prep_time_mins", String(data.prep_time_mins));
      }
      formData.append("is_active", String(data.is_active));

      if (variant) {
        formData.append("id", variant.id);
        const result = await updateMenuVariant(null, formData);
        if (result?.message) setErrorMsg(result.message);
        else onOpenChange(false);
      } else {
        const result = await createMenuVariant(null, formData);
        if (result?.message) setErrorMsg(result.message);
        else onOpenChange(false); // createMenuVariant redirects on success
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">{variant ? "Edit Variant" : "Add Variant"}</h2>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="mt-4 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-zinc-700">Variant Name * (e.g., Small, Medium)</label>
            <input
              {...form.register("name")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Default Selling Price (₹) *</label>
            <input
              type="number"
              step="0.01"
              {...form.register("default_price", { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            />
            {form.formState.errors.default_price && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.default_price.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">SKU</label>
              <input
                {...form.register("sku")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Serving Size</label>
              <input
                {...form.register("serving_size")}
                placeholder="e.g., 200ml"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Prep Time (mins)</label>
            <input
              type="number"
              {...form.register("prep_time_mins", { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_variant"
              {...form.register("is_active")}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-[#4a632a]"
            />
            <label htmlFor="is_active_variant" className="text-sm font-medium text-zinc-700">
              Active Variant
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

