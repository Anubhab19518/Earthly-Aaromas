"use client";

import { useActionState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { deleteAlertPolicy } from "@/modules/inventory/services/alert-policy.actions";
import { InventoryAlertPolicy } from "@/modules/inventory/schemas/alert-policy.schema";

interface DeleteAlertPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: InventoryAlertPolicy | null;
  locationName: string;
}

export function DeleteAlertPolicyDialog({
  open,
  onOpenChange,
  policy,
  locationName,
}: DeleteAlertPolicyDialogProps) {
  const [state, action, isPending] = useActionState(deleteAlertPolicy, null);

  const handleSubmit = () => {
    if (!state) {
      setTimeout(() => onOpenChange(false), 200);
    }
  };

  if (!open || !policy) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 border border-rose-200 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Delete Safety Policy</h2>
              <p className="text-[11px] text-slate-500">Remove location stock threshold</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs text-slate-600">
          <p>
            Are you sure you want to delete the alert policy for{" "}
            <span className="font-bold text-slate-900">{locationName}</span>?
          </p>
          <p className="text-[11px] text-slate-500">
            This location will no longer trigger automatic low stock warning indicators or draft replenishment suggestions.
          </p>
        </div>

        <form action={action} onSubmit={handleSubmit} className="mt-5">
          <input type="hidden" name="id" value={policy.id} />

          {state?.message && (
            <div className="mb-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
              {state.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
            >
              {isPending ? "Deleting..." : "Delete Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
