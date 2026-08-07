"use client";

import { useTransition, useState } from "react";
import { postGrn, cancelGrn, deleteGrn } from "@/modules/receiving/services/grn.actions";
import { GoodsReceipt } from "@/modules/receiving/schemas/grn.schema";

interface PostGrnDialogProps {
  grn: GoodsReceipt;
  itemCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostGrnDialog({ grn, itemCount, open, onOpenChange }: PostGrnDialogProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900">Post Goods Receipt</h2>
        <div className="mt-3 space-y-2 text-sm text-zinc-600">
          <p>
            You are about to post <strong>{grn.grn_number}</strong> with{" "}
            <strong>{itemCount} item{itemCount !== 1 ? "s" : ""}</strong>.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-500">
            <li>Inventory ledger entries will be created for each line.</li>
            <li>Inventory snapshots will update automatically.</li>
            <li>This GRN will become immutable and cannot be edited.</li>
          </ul>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{errorMsg}</div>
        )}

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
            onClick={handlePost}
            disabled={isPending || itemCount === 0}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {isPending ? "Posting..." : "Confirm & Post GRN"}
          </button>
        </div>
      </div>
    </div>
  );
}
