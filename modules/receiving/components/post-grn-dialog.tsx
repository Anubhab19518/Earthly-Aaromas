"use client";

import { useTransition, useState } from "react";
import { postGrn } from "@/modules/receiving/services/grn.actions";
import { GoodsReceipt } from "@/modules/receiving/schemas/grn.schema";
import { CheckCircle2, X, Loader2, AlertCircle, ShieldCheck } from "lucide-react";

interface PostGrnDialogProps {
  grn: GoodsReceipt;
  itemCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostGrnDialog({
  grn,
  itemCount,
  open,
  onOpenChange,
}: PostGrnDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handlePost = () => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", grn.id);

      const result = await postGrn(null, formData);
      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        onOpenChange(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-100 font-sans">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl relative border border-slate-200 text-xs">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/60">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 leading-tight">
              Post Goods Receipt
            </h2>
            <p className="text-[11px] text-slate-500">
              Confirm physical receipt & credit warehouse stock
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2.5 text-xs text-slate-700 py-1">
          <p>
            You are about to post <strong className="text-slate-900 font-mono">{grn.grn_number}</strong> containing{" "}
            <strong className="text-slate-900">{itemCount} line item{itemCount !== 1 ? "s" : ""}</strong>.
          </p>

          <div className="rounded-md bg-slate-50 border border-slate-200/80 p-3 space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span>Stock balances in warehouse inventory will be incremented automatically.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span>Audit transaction logs and valuation ledgers will be generated.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span>This receipt note will become permanent and cannot be deleted.</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 mt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePost}
            disabled={isPending || itemCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <span>Confirm & Post to Inventory</span>
                <CheckCircle2 className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
