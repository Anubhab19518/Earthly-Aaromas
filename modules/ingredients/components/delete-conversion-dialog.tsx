"use client";

import { useTransition, useState } from "react";
import { deleteConversion } from "@/modules/ingredients/services/ingredient-conversion.actions";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";

interface DeleteConversionDialogProps {
  conversion: IngredientUnitConversion | null;
  units: Unit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteConversionDialog({
  conversion,
  units,
  open,
  onOpenChange,
}: DeleteConversionDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open || !conversion) return null;

  const fromUnit = units.find((u) => u.id === conversion.from_unit_id);
  const toUnit = units.find((u) => u.id === conversion.to_unit_id);

  const handleDelete = () => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", conversion.id);

      const result = await deleteConversion(null, formData);

      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-red-600">Delete Conversion</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Remove the conversion:{" "}
          <strong>
            1 {fromUnit?.symbol ?? "?"} = {conversion.conversion_factor} {toUnit?.symbol ?? "?"}
          </strong>
          ?
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
