"use client";

import { useState } from "react";
import { Plus, Hash, Building2, FileText, Calendar, Activity } from "lucide-react";
import { useTransition } from "react";
import { GoodsReceipt } from "@/modules/receiving/schemas/grn.schema";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { deleteGrn } from "@/modules/receiving/services/grn.actions";
import { CreateGrnDialog } from "./create-grn-dialog";
import { useRouter } from "next/navigation";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";

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
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [activeSort, setActiveSort] = useState("date-desc");

  const sortOptions = [
    { label: "Date (Newest)", value: "date-desc" },
    { label: "Date (Oldest)", value: "date-asc" },
    { label: "GRN # (A-Z)", value: "number-asc" },
    { label: "GRN # (Z-A)", value: "number-desc" },
    { label: "Status (A-Z)", value: "status-asc" },
  ];
  const [showFilters, setShowFilters] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = (statusFilter ? grns.filter((g) => g.status === statusFilter) : grns).sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "number") {
      return a.grn_number.toLowerCase().localeCompare(b.grn_number.toLowerCase()) * mod;
    }
    if (by === "status") {
      return a.status.localeCompare(b.status) * mod;
    }
    if (by === "date") {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mod;
    }
    return 0;
  });

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "-";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Goods Receipts</h2>
          <p className="text-sm text-zinc-500">Create and manage incoming stock receipts (GRN).</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Create GRN
          </button>
        )}
      </div>

      <TableToolbar 
        sortOptions={sortOptions}
        activeSort={activeSort}
        onSortChange={setActiveSort}
        onFilter={() => setShowFilters(!showFilters)} 
      />

      {showFilters && (
        <div className="mb-4 flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-600"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="divide-x divide-zinc-200">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"><div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />GRN #</div></th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"><div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />Supplier</div></th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"><div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Invoice #</div></th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Received Date</div></th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500"><div className="flex items-center justify-center gap-1.5"><Activity className="w-3.5 h-3.5" />Status</div></th>
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
                <tr key={grn.id} onClick={() => router.push(`/receiving/${grn.id}`)} className="cursor-pointer hover:bg-zinc-50 divide-x divide-zinc-200">
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

