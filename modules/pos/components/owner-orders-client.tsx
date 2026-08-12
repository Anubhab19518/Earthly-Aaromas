"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Filter, Eye, ShoppingBag, Receipt, ArrowRight } from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface OwnerOrdersClientProps {
  initialData: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  shops: any[];
  activeBranchId?: string;
}

const ORDER_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED"
];

export function OwnerOrdersClient({
  initialData,
  totalCount,
  totalPages,
  currentPage,
  shops,
  activeBranchId
}: OwnerOrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [locationId, setLocationId] = useState(searchParams.get("location_id") || (activeBranchId || ""));
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order_number") || "");
  const [customerName, setCustomerName] = useState(searchParams.get("customer_name") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
      case "READY": return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "PREPARING": return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
      case "CONFIRMED": return "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20";
      case "CANCELLED": return "bg-red-50 text-red-700 ring-1 ring-red-600/20";
      default: return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Sales & POS Operations"
        title="Live Orders & Sales Ledger"
        description="Real-time order monitoring across shop locations, customer details, and status updates"
        icon={ShoppingBag}
        iconBgColor="bg-emerald-600 text-white"
        tabs={[
          { id: "orders-table", label: "Orders Ledger", icon: Receipt, count: totalCount },
          { id: "orders-filters", label: "Search & Filters", icon: Filter },
        ]}
      />

      {/* Filters */}
      <div id="orders-filters" className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-zinc-900">
          <Filter className="h-4 w-4 text-zinc-500" />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {!activeBranchId && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Shop</label>
              <select
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  updateFilters("location_id", e.target.value);
                }}
              >
                <option value="">All Shops</option>
                {shops.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Order #</label>
            <input
              type="text"
              placeholder="e.g. ORD-001"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onBlur={() => updateFilters("order_number", orderNumber)}
              onKeyDown={(e) => e.key === "Enter" && updateFilters("order_number", orderNumber)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Customer Name</label>
            <input
              type="text"
              placeholder="Search name"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onBlur={() => updateFilters("customer_name", customerName)}
              onKeyDown={(e) => e.key === "Enter" && updateFilters("customer_name", customerName)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Status</label>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                updateFilters("status", e.target.value);
              }}
            >
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div id="orders-table" className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Order #</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold text-right">Total</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Timeline</th>
                <th className="px-6 py-4 font-semibold">Creator</th>
                <th className="px-6 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {initialData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                initialData.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-zinc-900">
                      {row.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {row.locations?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-zinc-900">{row.customer_name || "Guest"}</div>
                      {row.customer_phone && <div className="text-xs text-zinc-500">{row.customer_phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-zinc-900">
                      ₹{Number(row.grand_total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider ${getStatusColor(row.order_status)}`}>
                        {row.order_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-zinc-900">
                        <span className="font-medium">Created:</span> {format(new Date(row.created_at), "h:mm a")}
                      </div>
                      {row.completed_at && (
                        <div className="text-xs text-zinc-500 mt-1">
                          <span className="font-medium">Completed:</span> {format(new Date(row.completed_at), "h:mm a")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-500">
                      {row.creator_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link 
                        href={`/orders/${row.id}`}
                        className="inline-flex items-center justify-center rounded-md bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-zinc-200 px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-zinc-500">
              Showing <span className="font-medium text-zinc-900">{(currentPage - 1) * 20 + 1}</span> to <span className="font-medium text-zinc-900">{Math.min(currentPage * 20, totalCount)}</span> of <span className="font-medium text-zinc-900">{totalCount}</span> entries
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
