"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Search, FileText, Hash, Building2, MapPin, Calendar, IndianRupee, Activity, ShoppingBag } from "lucide-react";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
    APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
    SENT: "bg-purple-50 text-purple-700 border-purple-200",
    PARTIAL: "bg-orange-50 text-orange-700 border-orange-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        styles[status] || styles.DRAFT
      }`}
    >
      {status}
    </span>
  );
}

export function PurchaseOrderListTable({
  purchaseOrders,
  suppliers,
  locations,
  canCreate,
}: {
  purchaseOrders: any[];
  suppliers: any[];
  locations: any[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [supplierFilter, setSupplierFilter] = useState<string>("ALL");
  const [activeSort, setActiveSort] = useState("date-desc");

  const sortOptions = [
    { label: "Date (Newest)", value: "date-desc" },
    { label: "Date (Oldest)", value: "date-asc" },
    { label: "PO # (A-Z)", value: "number-asc" },
    { label: "PO # (Z-A)", value: "number-desc" },
    { label: "Status (A-Z)", value: "status-asc" },
    { label: "Total Amount (High-Low)", value: "amount-desc" },
    { label: "Total Amount (Low-High)", value: "amount-asc" },
  ];
  const [showFilters, setShowFilters] = useState(false);

  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || po.status === statusFilter;
    const matchesSupplier = supplierFilter === "ALL" || po.supplier_id === supplierFilter;
    return matchesSearch && matchesStatus && matchesSupplier;
  }).sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "number") {
      return a.po_number.toLowerCase().localeCompare(b.po_number.toLowerCase()) * mod;
    }
    if (by === "status") {
      return a.status.localeCompare(b.status) * mod;
    }
    if (by === "amount") {
      return (Number(a.total_amount) - Number(b.total_amount)) * mod;
    }
    if (by === "date") {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mod;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Procurement & Purchasing"
        title="Purchase Orders Directory"
        description="Create, track, and manage raw material purchase orders sent to approved suppliers"
        icon={FileText}
        iconBgColor="bg-sky-600 text-white"
        tabs={[
          { id: "pos-table", label: "Purchase Orders Master", icon: FileText, count: purchaseOrders.length },
        ]}
        actions={
          canCreate ? (
            <Link
              href="/purchase-orders/new"
              className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New PO</span>
            </Link>
          ) : undefined
        }
      />

      <div id="pos-table" className="space-y-4">

      <TableToolbar 
        sortOptions={sortOptions}
        activeSort={activeSort}
        onSortChange={setActiveSort}
        onFilter={() => setShowFilters(!showFilters)} 
      />

      {showFilters && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="search"
            placeholder="Search PO Number..."
            className="flex h-9 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex h-9 w-[180px] items-center justify-between whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#4a632a] disabled:cursor-not-allowed disabled:opacity-50">
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="APPROVED">Approved</option>
          <option value="SENT">Sent</option>
          <option value="PARTIAL">Partial</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="flex h-9 w-[220px] items-center justify-between whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#4a632a] disabled:cursor-not-allowed disabled:opacity-50">
          <option value="ALL">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      )}

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-zinc-300" />
            <h3 className="text-lg font-medium text-zinc-900">No Purchase Orders</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Create a new purchase order to start requesting stock from suppliers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr className="divide-x divide-zinc-200">
                  <th className="px-4 py-3 font-medium"><div className="flex items-center gap-1.5"><Hash className="w-4 h-4 text-zinc-400" />PO Number</div></th>
                  <th className="px-4 py-3 font-medium"><div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-zinc-400" />Supplier</div></th>
                  <th className="px-4 py-3 font-medium"><div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-zinc-400" />Destination</div></th>
                  <th className="px-4 py-3 font-medium"><div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-zinc-400" />Expected Delivery</div></th>
                  <th className="px-4 py-3 font-medium"><div className="flex items-center gap-1.5"><IndianRupee className="w-4 h-4 text-zinc-400" />Total Cost</div></th>
                  <th className="px-4 py-3 font-medium"><div className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-zinc-400" />Status</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredOrders.map((po) => {
                  const supplier = suppliers.find((s) => s.id === po.supplier_id);
                  const location = locations.find((l) => l.id === po.location_id);
                  return (
                    <tr key={po.id} onClick={() => router.push(`/purchase-orders/${po.id}`)} className="cursor-pointer hover:bg-zinc-50 divide-x divide-zinc-200">
                      <td className="px-4 py-3 font-medium text-zinc-900">{po.po_number}</td>
                      <td className="px-4 py-3 text-zinc-600">{supplier?.name || "Unknown"}</td>
                      <td className="px-4 py-3 text-zinc-600">{location?.name || "Unknown"}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {po.expected_delivery_date
                          ? format(new Date(po.expected_delivery_date), "MMM d, yyyy")
                          : "Not set"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(po.total_expected_cost)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={po.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

