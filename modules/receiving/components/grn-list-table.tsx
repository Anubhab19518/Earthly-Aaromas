"use client";

import { useState } from "react";
import { useTransition } from "react";
import { GoodsReceipt } from "@/modules/receiving/schemas/grn.schema";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { deleteGrn } from "@/modules/receiving/services/grn.actions";
import { CreateGrnDialog } from "./create-grn-dialog";
import Link from "next/link";

interface GrnListTableProps {
  grns: GoodsReceipt[];
  suppliers: Supplier[];
  warehouseLocations: Location[];
  purchaseOrders: any[];
  canCreate: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  POSTED: "bg-green-100 text-green-800",
  CANCELLED: "bg-zinc-100 text-zinc-600",
};

export function GrnListTable({ grns, suppliers, warehouseLocations, purchaseOrders, canCreate }: GrnListTableProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const filtered = statusFilter ? grns.filter((g) => g.status === statusFilter) : grns;

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "-";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Goods Receipts</h2>
          <p className="text-sm text-zinc-500">Create and manage incoming stock receipts (GRN).</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#4a632a]"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a4f20]"
            >
              Create GRN
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">GRN #</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Received Date</th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No goods receipts found. Create your first GRN to start receiving stock.
                </td>
              </tr>
            ) : (
              filtered.map((grn) => (
                <tr key={grn.id} className="hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-semibold text-zinc-900">
                    {grn.grn_number}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">
                    {getSupplierName(grn.supplier_id)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    {grn.invoice_number || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    {grn.received_date}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[grn.status] || ""}`}>
                      {grn.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <Link
                      href={`/receiving/${grn.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      {grn.status === "DRAFT" ? "Edit" : "View"}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateGrnDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        suppliers={suppliers}
        warehouseLocations={warehouseLocations}
        purchaseOrders={purchaseOrders}
      />
    </div>
  );
}

