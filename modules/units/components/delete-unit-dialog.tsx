"use client";

import { useTransition, useState } from "react";
import { deleteUnit } from "@/modules/units/services/unit.actions";
import { Unit } from "@/modules/units/schemas/unit.schema";

interface DeleteUnitDialogProps {
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUnitDialog({ unit, open, onOpenChange }: DeleteUnitDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open || !unit) return null;

  const handleDelete = () => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", unit.id);
      
      const result = await deleteUnit(null, formData);
      
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
        <h2 className="text-xl font-semibold text-red-600">Delete Unit</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Are you sure you want to delete <strong>{unit.name} ({unit.symbol})</strong>? This action will mark it as inactive and hide it from regular views. Note: Global units might be referenced across the system.
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
