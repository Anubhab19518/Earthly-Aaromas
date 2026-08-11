"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createSupplier,
  updateSupplier,
} from "@/modules/suppliers/services/supplier.actions";
import {
  createSupplierSchema,
  CreateSupplierFormValues,
  Supplier,
} from "@/modules/suppliers/schemas/supplier.schema";

interface SupplierDialogProps {
  supplier?: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierDialog({ supplier, open, onOpenChange }: SupplierDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<CreateSupplierFormValues>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      name: supplier?.name || "",
      phone: supplier?.phone || "",
      email: supplier?.email || "",
      gstin: supplier?.gstin || "",
      address: supplier?.address || "",
      notes: supplier?.notes || "",
      status: supplier?.status || "ACTIVE",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: supplier?.name || "",
        phone: supplier?.phone || "",
        email: supplier?.email || "",
        gstin: supplier?.gstin || "",
        address: supplier?.address || "",
        notes: supplier?.notes || "",
        status: supplier?.status || "ACTIVE",
      });
      setErrorMsg(null);
    }
  }, [open, supplier, form]);

  const onSubmit = (data: CreateSupplierFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);

      const formData = new FormData();
      if (supplier) formData.append("id", supplier.id);
      formData.append("name", data.name);
      if (data.phone) formData.append("phone", data.phone);
      if (data.email) formData.append("email", data.email);
      if (data.gstin) formData.append("gstin", data.gstin);
      if (data.address) formData.append("address", data.address);
      if (data.notes) formData.append("notes", data.notes);
      formData.append("status", data.status);

      const result = supplier
        ? await updateSupplier(null, formData)
        : await createSupplier(null, formData);

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
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold">{supplier ? "Edit Supplier" : "Add Supplier"}</h2>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Name *</label>
              <input
                {...form.register("name")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                placeholder="e.g., ABC Suppliers"
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">GSTIN</label>
              <input
                {...form.register("gstin")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a] uppercase"
                placeholder="e.g., 22AAAAA0000A1Z5"
              />
              {form.formState.errors.gstin && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.gstin.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Phone</label>
              <input
                {...form.register("phone")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                placeholder="e.g., +91 9876543210"
              />
              {form.formState.errors.phone && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Email</label>
              <input
                {...form.register("email")}
                type="email"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                placeholder="e.g., contact@abcsuppliers.com"
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">Address</label>
              <textarea
                {...form.register("address")}
                rows={2}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                placeholder="Full address..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">Notes</label>
              <textarea
                {...form.register("notes")}
                rows={2}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                placeholder="Optional notes..."
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

