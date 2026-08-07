"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createStockTransfer, updateStockTransfer } from "@/modules/inventory/services/stock-transfer.actions";

export function StockTransferForm({
  locations,
  transfer,
}: {
  locations: any[];
  transfer?: any;
}) {
  const router = useRouter();
  const isEditing = !!transfer;
  const action = isEditing ? updateStockTransfer : createStockTransfer;
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {isEditing && <input type="hidden" name="id" value={transfer.id} />}

      {state?.message && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{state.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="sourceLocationId" className="block text-sm font-medium text-zinc-700">Source Location <span className="text-red-500">*</span></label>
          <select name="sourceLocationId" defaultValue={transfer?.source_location_id || ""} required className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-[#4a632a] focus:outline-none focus:ring-1 focus:ring-[#4a632a]">
            <option value="">Select a location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="destinationLocationId" className="block text-sm font-medium text-zinc-700">Destination Location <span className="text-red-500">*</span></label>
          <select name="destinationLocationId" defaultValue={transfer?.destination_location_id || ""} required className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-[#4a632a] focus:outline-none focus:ring-1 focus:ring-[#4a632a]">
            <option value="">Select a location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700">Notes</label>
        <textarea
          id="notes"
          name="notes"
          placeholder="Any instructions for the transfer..."
          defaultValue={transfer?.notes || ""}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-[#4a632a] focus:outline-none focus:ring-1 focus:ring-[#4a632a]"
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
        <button type="submit" disabled={isPending} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-[#587333] text-zinc-50 shadow hover:bg-[#587333]/90 h-9 px-4 py-2 disabled:pointer-events-none disabled:opacity-50">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Stock Transfer" : "Create Stock Transfer"}
        </button>
      </div>
    </form>
  );
}

