"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";

interface AuditLogClientProps {
  initialData: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  profiles: any[];
  entityTypes?: any[]; // optional
}

export function AuditLogClient({
  initialData,
  totalCount,
  totalPages,
  currentPage,
  profiles,
}: AuditLogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [actorId, setActorId] = useState(searchParams.get("actor_id") || "");
  const [action, setAction] = useState(searchParams.get("action") || "");
  const [entityType, setEntityType] = useState(searchParams.get("entity_type") || "");
  
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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

  const ENTITY_TYPES = [
    "purchase_orders",
    "goods_receipts",
    "stock_transfers",
    "sales_orders",
    "inventory_ledger",
    "menu_variants",
    "ingredients"
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Audit & Activity Log</h1>
          <p className="mt-1 text-sm text-zinc-500">Owner monitoring of all system activities</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-zinc-900">
          <Filter className="h-4 w-4 text-zinc-500" />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Actor</label>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#587333] focus:outline-none focus:ring-1 focus:ring-[#587333]"
              value={actorId}
              onChange={(e) => {
                setActorId(e.target.value);
                updateFilters("actor_id", e.target.value);
              }}
            >
              <option value="">All Actors</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Action</label>
            <input
              type="text"
              placeholder="e.g. CREATE, UPDATE"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#587333] focus:outline-none focus:ring-1 focus:ring-[#587333]"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              onBlur={() => updateFilters("action", action)}
              onKeyDown={(e) => e.key === "Enter" && updateFilters("action", action)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Entity Type</label>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#587333] focus:outline-none focus:ring-1 focus:ring-[#587333]"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                updateFilters("entity_type", e.target.value);
              }}
            >
              <option value="">All Entities</option>
              {ENTITY_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-semibold w-12"></th>
                <th className="px-6 py-4 font-semibold">Date & Time</th>
                <th className="px-6 py-4 font-semibold">Actor</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Entity Type</th>
                <th className="px-6 py-4 font-semibold">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {initialData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                initialData.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-zinc-50 transition-colors cursor-pointer" onClick={() => toggleRow(row.id)}>
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                        {expandedRows[row.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-zinc-900">{format(new Date(row.occurred_at), "MMM d, yyyy")}</div>
                        <div className="text-xs text-zinc-500">{format(new Date(row.occurred_at), "h:mm:ss a")}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-zinc-900">
                        {row.profiles?.full_name || "System"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 tracking-wider">
                          {row.action.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-700">
                        {row.entity_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-700 font-mono">
                        {row.formatted_entity_id || row.entity_id || "-"}
                      </td>
                    </tr>
                    {expandedRows[row.id] && (
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Old Data</h4>
                              <pre className="bg-white p-3 rounded-lg border border-zinc-200 text-xs overflow-x-auto font-mono text-zinc-700 max-h-60">
                                {row.old_data ? JSON.stringify(row.old_data, null, 2) : "None"}
                              </pre>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">New Data</h4>
                              <pre className="bg-white p-3 rounded-lg border border-zinc-200 text-xs overflow-x-auto font-mono text-zinc-700 max-h-60">
                                {row.new_data ? JSON.stringify(row.new_data, null, 2) : "None"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
