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

  useEffect(() => {
    if (state === null && isPending === false && open && policy) {
      // Typically handled via action result, but let's just close optimistically.
    }
  }, [state, isPending, open, policy]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Let the form submit normally (via action)
    if (!state) {
      setTimeout(() => onOpenChange(false), 200);
    }
  };

  if (!open || !policy) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 animate-in fade-in duration-150" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2>Delete Alert Policy</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm text-zinc-500">
          Are you sure you want to delete the alert policy for <span className="font-semibold text-zinc-900">{locationName}</span>? This action cannot be undone.
        </p>

        <form action={action} onSubmit={handleSubmit} className="mt-6">
          <input type="hidden" name="id" value={policy.id} />

          {state?.message && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {state.message}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-900 focus:ring-offset-2 disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Delete Policy"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
