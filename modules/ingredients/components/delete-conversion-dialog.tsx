"use client";

import { useTransition, useState } from "react";
import { deleteConversion } from "@/modules/ingredients/services/ingredient-conversion.actions";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { AlertTriangle, X } from "lucide-react";

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 border border-rose-200 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Delete Conversion Rule</h2>
              <p className="text-[11px] text-slate-500">Confirm removal of packaging unit</p>
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
            Are you sure you want to remove this packaging conversion rule? Any pending purchase orders using this unit will need to be re-evaluated.
          </p>
          <div className="rounded-lg bg-slate-50 border border-slate-200/90 p-3 font-mono text-center text-slate-900 font-bold">
            1 {fromUnit?.name || fromUnit?.symbol || "?"} = {conversion.conversion_factor} {toUnit?.symbol ?? "?"}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
          >
            {isPending ? "Deleting..." : "Delete Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
