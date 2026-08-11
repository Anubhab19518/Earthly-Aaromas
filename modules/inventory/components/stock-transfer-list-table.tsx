"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Search, FileText, ArrowLeftRight, MapPin, Calendar, Activity } from "lucide-react";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "text-slate-600 font-bold",
    SHIPPED: "text-[#254f8a] font-bold",
    RECEIVED: "text-emerald-600 font-bold",
    CANCELLED: "text-rose-600 font-bold",
  };

  return (
    <span className={styles[status] || styles.DRAFT}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
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
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [activeSort, setActiveSort] = useState("date-desc");

  const sortOptions = [
    { label: "Date (Newest)", value: "date-desc" },
    { label: "Date (Oldest)", value: "date-asc" },
    { label: "Transfer # (A-Z)", value: "number-asc" },
    { label: "Transfer # (Z-A)", value: "number-desc" },
    { label: "Status (A-Z)", value: "status-asc" },
  ];
  const [showFilters, setShowFilters] = useState(false);

  const filteredTransfers = transfers.filter((tr) => {
    const matchesSearch = tr.transfer_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || tr.status === statusFilter;
    const matchesLocation = locationFilter === "ALL" || tr.source_location_id === locationFilter || tr.destination_location_id === locationFilter;
    return matchesSearch && matchesStatus && matchesLocation;
  }).sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "number") {
      return a.transfer_number.toLowerCase().localeCompare(b.transfer_number.toLowerCase()) * mod;
    }
    if (by === "status") {
      return a.status.localeCompare(b.status) * mod;
    }
    if (by === "date") {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mod;
    }
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Stock Transfers</h1>
        {canCreate && (
          <Link href="/stock-transfers/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-sky-600 text-zinc-50 shadow hover:bg-sky-600/90 h-9 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />
            New Transfer
          </Link>
        )}
      </div>

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
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
        {filteredTransfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900">No Stock Transfers</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a new stock transfer to move inventory between locations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-[#f8fafc] border-b border-slate-200">
                <tr className="divide-x divide-slate-200">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><ArrowLeftRight className="w-3.5 h-3.5" />Transfer #</div></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Source</div></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Destination</div></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Date</div></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />Status</div></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredTransfers.map((tr) => {
                  const source = locations.find((l) => l.id === tr.source_location_id);
                  const destination = locations.find((l) => l.id === tr.destination_location_id);
                  return (
                    <tr key={tr.id} onClick={() => router.push(`/stock-transfers/${tr.id}`)} className="cursor-pointer hover:bg-slate-50 transition-colors divide-x divide-slate-200">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                        {tr.transfer_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">{source?.name || "Unknown"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">{destination?.name || "Unknown"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {format(new Date(tr.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={tr.status} />
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

