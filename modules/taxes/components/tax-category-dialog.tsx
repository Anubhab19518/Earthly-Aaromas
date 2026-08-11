"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTaxCategory,
  updateTaxCategory,
} from "@/modules/taxes/services/tax.actions";
import {
  createTaxCategorySchema,
  CreateTaxCategoryFormValues,
  TaxCategory,
} from "@/modules/taxes/schemas/tax.schema";

interface TaxCategoryDialogProps {
  category?: TaxCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaxCategoryDialog({ category, open, onOpenChange }: TaxCategoryDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<CreateTaxCategoryFormValues>({
    resolver: zodResolver(createTaxCategorySchema),
    defaultValues: {
      name: category?.name || "",
      description: category?.description || "",
      status: category?.status || "ACTIVE",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name || "",
        description: category?.description || "",
        status: category?.status || "ACTIVE",
      });
      setErrorMsg(null);
    }
  }, [open, category, form]);

  const onSubmit = (data: CreateTaxCategoryFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);

      const formData = new FormData();
      if (category) formData.append("id", category.id);
      formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);
      formData.append("status", data.status);

      const result = category
        ? await updateTaxCategory(null, formData)
        : await createTaxCategory(null, formData);

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
        <h2 className="text-xl font-semibold">{category ? "Edit Tax Category" : "Add Tax Category"}</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Name *</label>
            <input
              {...form.register("name")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              placeholder="e.g., GST 18%"
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
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Status *</label>
            <select
              {...form.register("status")}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
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

