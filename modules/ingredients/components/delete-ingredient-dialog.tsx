"use client";

import { useTransition, useState } from "react";
import { deleteIngredient } from "@/modules/ingredients/services/ingredient.actions";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";

interface DeleteIngredientDialogProps {
  ingredient: Ingredient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteIngredientDialog({ ingredient, open, onOpenChange }: DeleteIngredientDialogProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-red-600">Delete Ingredient</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Are you sure you want to delete <strong>{ingredient.name}</strong> ({ingredient.sku})?
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
