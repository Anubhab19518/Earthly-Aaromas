"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { addStockTransferItem } from "@/modules/inventory/services/stock-transfer.actions";

export function StockTransferItemForm({
  transferId,
  ingredients,
  units,
  onSuccess,
}: {
  transferId: string;
  ingredients: any[];
  units: any[];
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(addStockTransferItem, null);

  useEffect(() => {
    if (state === null && !isPending) {
    }
  }, [state, isPending]);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        setTimeout(() => {
        }, 500);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="transferId" value={transferId} />

      {state?.message && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{state.message}</p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="ingredientId" className="block text-sm font-medium text-zinc-700">Ingredient <span className="text-red-500">*</span></label>
        <select name="ingredientId" required className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-[#4a632a]">
          <option value="">Select ingredient</option>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="quantity" className="block text-sm font-medium text-zinc-700">Quantity <span className="text-red-500">*</span></label>
          <input id="quantity" name="quantity" type="number" step="0.001" min="0.001" required className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-[#4a632a]" />
        </div>
        <div className="space-y-2">
          <label htmlFor="unitId" className="block text-sm font-medium text-zinc-700">Unit <span className="text-red-500">*</span></label>
          <select name="unitId" required className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 bg-white text-sm shadow-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-[#4a632a]">
            <option value="">Select unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.abbreviation})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onSuccess}
          disabled={isPending}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 h-9 px-4 py-2 disabled:pointer-events-none disabled:opacity-50"
        >
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-sky-600 text-zinc-50 shadow hover:bg-sky-600/90 h-9 px-4 py-2 disabled:pointer-events-none disabled:opacity-50">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Item
        </button>
      </div>
    </form>
  );
}

