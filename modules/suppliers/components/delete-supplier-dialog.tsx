"use client";

import { useTransition, useState } from "react";
import { deleteSupplier } from "@/modules/suppliers/services/supplier.actions";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";

interface DeleteSupplierDialogProps {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSupplierDialog({ supplier, open, onOpenChange }: DeleteSupplierDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open || !supplier) return null;

  const handleDelete = () => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", supplier.id);

      const result = await deleteSupplier(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-red-600">Delete Supplier</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Are you sure you want to delete <strong>{supplier.name}</strong>?
          This will soft-delete it and hide it from all views.
        </p>

        {errorMsg && <p className="mt-4 text-sm text-red-600">{errorMsg}</p>}

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
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
