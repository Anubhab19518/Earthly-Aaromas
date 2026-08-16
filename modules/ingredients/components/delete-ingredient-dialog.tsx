"use client";

import { useTransition, useState } from "react";
import { deleteIngredient } from "@/modules/ingredients/services/ingredient.actions";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { AlertTriangle, X } from "lucide-react";

interface DeleteIngredientDialogProps {
  ingredient: Ingredient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteIngredientDialog({
  ingredient,
  open,
  onOpenChange,
}: DeleteIngredientDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open || !ingredient) return null;

  const handleDelete = () => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", ingredient.id);

      const result = await deleteIngredient(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Delete Ingredient</h2>
              <p className="text-[11px] text-slate-500">Soft-delete from master catalog</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-xs text-slate-600">
          <p>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900">{ingredient.name}</span>{" "}
            <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded-md">
              {ingredient.sku}
            </span>
            ?
          </p>
          <p className="text-[11px] text-slate-400">
            This item will be soft-deleted and removed from active recipe lookups and stock purchase forms.
          </p>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-md bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-md bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
          >
            {isPending ? "Deleting..." : "Delete ingredient"}
          </button>
        </div>
      </div>
    </div>
  );
}
