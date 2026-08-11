"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createPurchaseOrder, updatePurchaseOrder } from "@/modules/purchasing/services/purchase-order.actions";

export function PurchaseOrderForm({
  suppliers,
  locations,
  po,
}: {
  suppliers: any[];
  locations: any[];
  po?: any;
}) {
  const router = useRouter();
  const isEditing = !!po;
  const action = isEditing ? updatePurchaseOrder : createPurchaseOrder;
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {isEditing && <input type="hidden" name="id" value={po.id} />}

      {state?.message && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{state.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="supplierId" className="block text-sm font-medium text-zinc-700">Supplier <span className="text-red-500">*</span></label>
          <select name="supplierId" defaultValue={po?.supplier_id || ""} required className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-[#4a632a]">
            <option value="">Select a supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="locationId" className="block text-sm font-medium text-zinc-700">Destination Warehouse <span className="text-red-500">*</span></label>
          <select name="locationId" defaultValue={po?.location_id || ""} required className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-[#4a632a]">
            <option value="">Select a warehouse</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-zinc-700">Expected Delivery Date</label>
          <input
            id="expectedDeliveryDate"
            name="expectedDeliveryDate"
            type="date"
            defaultValue={po?.expected_delivery_date || ""}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-[#4a632a]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700">Notes</label>
        <textarea
          id="notes"
          name="notes"
          placeholder="Any instructions for the supplier..."
          defaultValue={po?.notes || ""}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-[#4a632a]"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 h-9 px-4 py-2 disabled:pointer-events-none disabled:opacity-50"
        >
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-sky-600 text-zinc-50 shadow hover:bg-sky-600/90 h-9 px-4 py-2 disabled:pointer-events-none disabled:opacity-50">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Purchase Order" : "Create Purchase Order"}
        </button>
      </div>
    </form>
  );
}

