"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Search, FileText } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
    SHIPPED: "bg-blue-50 text-blue-700 border-blue-200",
    RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
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

export function StockTransferListTable({
  transfers,
  locations,
  activeBranchId,
  canCreate,
}: {
  transfers: any[];
  locations: any[];
  activeBranchId?: string;
  canCreate?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");

  const filteredTransfers = transfers.filter((tr) => {
    const matchesSearch = tr.transfer_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || tr.status === statusFilter;
    const matchesLocation = locationFilter === "ALL" || tr.source_location_id === locationFilter || tr.destination_location_id === locationFilter;
    return matchesSearch && matchesStatus && matchesLocation;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Stock Transfers</h1>
        {canCreate && (
          <Link href="/stock-transfers/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-[#587333] text-zinc-50 shadow hover:bg-[#587333]/90 h-9 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />
            New Transfer
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="search"
            placeholder="Search Transfer Number..."
            className="flex h-9 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex h-9 w-[180px] items-center justify-between whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#4a632a] disabled:cursor-not-allowed disabled:opacity-50">
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SHIPPED">Shipped</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="flex h-9 w-[220px] items-center justify-between whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#4a632a] disabled:cursor-not-allowed disabled:opacity-50">
          <option value="ALL">All Locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {filteredTransfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-zinc-300" />
            <h3 className="text-lg font-medium text-zinc-900">No Stock Transfers</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Create a new stock transfer to move inventory between locations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-500 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Transfer #</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Destination</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransfers.map((tr) => {
                  const source = locations.find((l) => l.id === tr.source_location_id);
                  const destination = locations.find((l) => l.id === tr.destination_location_id);
                  return (
                    <tr key={tr.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{tr.transfer_number}</td>
                      <td className="px-4 py-3 text-zinc-600">{source?.name || "Unknown"}</td>
                      <td className="px-4 py-3 text-zinc-600">{destination?.name || "Unknown"}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {format(new Date(tr.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={tr.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/stock-transfers/${tr.id}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-100 hover:text-zinc-900 h-8 px-3">
                          View
                        </Link>
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
  );
}

