"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGrn } from "@/modules/receiving/services/grn.actions";
import { createGrnSchema, CreateGrnFormValues } from "@/modules/receiving/schemas/grn.schema";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { Location } from "@/modules/locations/schemas/location.schema";

interface CreateGrnDialogProps {
  suppliers: Supplier[];
  warehouseLocations: Location[];
  purchaseOrders: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGrnDialog({ suppliers, warehouseLocations, purchaseOrders, open, onOpenChange }: CreateGrnDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<CreateGrnFormValues>({
    resolver: zodResolver(createGrnSchema),
    defaultValues: {
      supplier_id: "",
      warehouse_location_id: "",
      purchase_order_id: "",
      invoice_number: "",
      invoice_date: "",
      received_date: new Date().toISOString().split("T")[0],
      remarks: "",
    },
  });

  // Watch for PO changes
  const selectedPoId = form.watch("purchase_order_id");

  useEffect(() => {
    if (selectedPoId) {
      const po = purchaseOrders.find((p) => p.id === selectedPoId);
      if (po) {
        form.setValue("supplier_id", po.supplier_id);
        form.setValue("warehouse_location_id", po.location_id);
      }
    }
  }, [selectedPoId, purchaseOrders, form]);

  useEffect(() => {
    if (open) {
      form.reset({
        supplier_id: "",
        warehouse_location_id: "",
        purchase_order_id: "",
        invoice_number: "",
        invoice_date: "",
        received_date: new Date().toISOString().split("T")[0],
        remarks: "",
      });
      setErrorMsg(null);
    }
  }, [open, form]);

  const onSubmit = (data: CreateGrnFormValues) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("supplier_id", data.supplier_id);
      formData.append("warehouse_location_id", data.warehouse_location_id);
      if (data.purchase_order_id) formData.append("purchase_order_id", data.purchase_order_id);
      if (data.invoice_number) formData.append("invoice_number", data.invoice_number);
      if (data.invoice_date) formData.append("invoice_date", data.invoice_date);
      formData.append("received_date", data.received_date);
      if (data.remarks) formData.append("remarks", data.remarks);

      const result = await createGrn(null, formData);
      if (result?.message) setErrorMsg(result.message);
      // On success, createGrn calls redirect() so this component unmounts
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Create Goods Receipt</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-700">Link Purchase Order (Optional)</label>
              <select
                {...form.register("purchase_order_id")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              >
                <option value="">No Purchase Order (Manual GRN)</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>{po.po_number} ({po.status})</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-700">Supplier *</label>
              <select
                {...form.register("supplier_id")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {form.formState.errors.supplier_id && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.supplier_id.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-700">Receiving Warehouse *</label>
              <select
                {...form.register("warehouse_location_id")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              >
                <option value="">Select warehouse...</option>
                {warehouseLocations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {form.formState.errors.warehouse_location_id && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.warehouse_location_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Invoice #</label>
              <input
                {...form.register("invoice_number")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
                placeholder="e.g., INV-2024-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Invoice Date</label>
              <input
                type="date"
                {...form.register("invoice_date")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-700">Received Date *</label>
              <input
                type="date"
                {...form.register("received_date")}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
              {form.formState.errors.received_date && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.received_date.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-700">Remarks</label>
              <textarea
                {...form.register("remarks")}
                rows={2}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-[#4a632a]"
              />
            </div>
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
              {isPending ? "Creating..." : "Create GRN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

