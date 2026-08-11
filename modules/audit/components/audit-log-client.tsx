"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, ChevronDown, ChevronRight, Calendar, User, Zap, Layers, Hash } from "lucide-react";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";

interface AuditLogClientProps {
  initialData: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  profiles: any[];
  entityTypes?: any[]; // optional
  ingredients?: any[];
  units?: any[];
  locations?: any[];
}

export function AuditLogClient({
  initialData,
  totalCount,
  totalPages,
  currentPage,
  profiles,
  ingredients = [],
  units = [],
  locations = [],
}: AuditLogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [actorId, setActorId] = useState(searchParams.get("actor_id") || "");
  const [action, setAction] = useState(searchParams.get("action") || "");
  const [entityType, setEntityType] = useState(searchParams.get("entity_type") || "");
  const [showFilters, setShowFilters] = useState(false);
  
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

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const [by, order] = value.split("-");
    params.set("sort_by", by);
    params.set("sort_order", order);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeSort = searchParams.get("sort_by") 
    ? `${searchParams.get("sort_by")}-${searchParams.get("sort_order") || "desc"}`
    : "date-desc";

  const sortOptions = [
    { label: "Date (Newest)", value: "date-desc" },
    { label: "Date (Oldest)", value: "date-asc" },
    { label: "Actor (A-Z)", value: "actor-asc" },
    { label: "Actor (Z-A)", value: "actor-desc" },
    { label: "Entity Type (A-Z)", value: "entity_type-asc" },
    { label: "Action (A-Z)", value: "action-asc" },
  ];

  const formatData = (data: any, entityType: string) => {
    if (!data || typeof data !== 'object') return data;
    
    // Create a copy to modify
    const formatted = { ...data };

    // Map common IDs to names
    if (formatted.ingredient_id) {
      const ingredient = ingredients.find(i => i.id === formatted.ingredient_id);
      if (ingredient) formatted.ingredient = ingredient.name;
      delete formatted.ingredient_id;
    }
    if (formatted.location_id) {
      const location = locations.find(l => l.id === formatted.location_id);
      if (location) formatted.location = location.name;
      delete formatted.location_id;
    }
    if (formatted.unit_id) {
      const unit = units.find(u => u.id === formatted.unit_id);
      if (unit) formatted.unit = `${unit.name} (${unit.symbol})`;
      delete formatted.unit_id;
    }
    if (formatted.actor_id) {
      const actor = profiles.find(p => p.id === formatted.actor_id);
      if (actor) formatted.actor = actor.full_name || actor.email;
      delete formatted.actor_id;
    }

    // Special case for inventory ledger
    if (entityType === "inventory_ledger") {
      const simplified: any = {};
      if (formatted.ingredient) simplified.Item = formatted.ingredient;
      
      const unitStr = formatted.unit ? ` ${formatted.unit}` : "";

      if (formatted.quantity_change !== undefined) {
        simplified.Change = `${formatted.quantity_change > 0 ? '+' : ''}${formatted.quantity_change}${unitStr}`;
      } 
      if (formatted.total_quantity_on_hand !== undefined) {
        simplified["Total Quantity"] = `${formatted.total_quantity_on_hand}${unitStr}`;
      }
      
      // Include transaction type if present
      if (formatted.transaction_type) {
        simplified["Transaction Type"] = formatted.transaction_type;
      }
      
      return simplified;
    }

    return formatted;
  };

  const renderDataAsText = (data: any) => {
    if (!data) return <span className="text-slate-400 italic">No data</span>;
    if (typeof data !== 'object') return <span className="text-slate-700">{String(data)}</span>;

    const entries = Object.entries(data);
    if (entries.length === 0) return <span className="text-slate-400 italic">Empty</span>;

    return (
      <ul className="space-y-2">
        {entries.map(([key, value]) => {
          // Format key: replace underscores with spaces, capitalize words
          const formattedKey = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          
          return (
            <li key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-semibold text-slate-500 min-w-[120px]">{formattedKey}:</span>
              <span className="text-slate-900 font-medium break-all">{value !== null && value !== undefined ? String(value) : "N/A"}</span>
            </li>
          );
        })}
      </ul>
    );
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

      <TableToolbar 
        onFilter={() => setShowFilters(!showFilters)} 
        sortOptions={sortOptions}
        activeSort={activeSort}
        onSortChange={handleSortChange}
      />

      {/* Filters */}
      {showFilters && (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-zinc-900">
          <Filter className="h-4 w-4 text-zinc-500" />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Actor</label>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              onBlur={() => updateFilters("action", action)}
              onKeyDown={(e) => e.key === "Enter" && updateFilters("action", action)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Entity Type</label>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
      )}

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-[#f8fafc] border-b border-slate-200">
                <tr className="divide-x divide-slate-200">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-12"></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Date &amp; Time</div></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Actor</div></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Action</div></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Entity Type</div></th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />Entity ID</div></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
              {initialData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                initialData.map((row) => {
                  let actionClass = "text-slate-600";
                  if (row.action.includes("CREATE") || row.action.includes("POST")) actionClass = "text-[#254f8a] font-bold";
                  else if (row.action.includes("UPDATE")) actionClass = "text-amber-600 font-bold";
                  else if (row.action.includes("DELETE") || row.action.includes("CANCEL")) actionClass = "text-rose-600 font-bold";
                  else actionClass = "text-slate-600 font-bold";

                  return (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-slate-50 transition-colors cursor-pointer divide-x divide-slate-200" onClick={() => toggleRow(row.id)}>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-center">
                        {expandedRows[row.id] ? <ChevronDown className="h-4 w-4 inline-block hover:text-slate-600" /> : <ChevronRight className="h-4 w-4 inline-block hover:text-slate-600" />}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{format(new Date(row.occurred_at), "MMM d, yyyy")}</div>
                        <div className="text-[11px] text-slate-500">{format(new Date(row.occurred_at), "h:mm:ss a").toLowerCase()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                        {row.profiles?.full_name || "System"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={actionClass}>
                          {row.action.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {row.entity_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-[#254f8a]">
                        {row.formatted_entity_id || row.entity_id || "-"}
                      </td>
                    </tr>
                    {expandedRows[row.id] && (
                      <tr className="bg-[#f8fafc] border-b border-slate-200">
                        <td colSpan={6} className="px-6 py-6">
                          <div className="grid grid-cols-2 gap-8">
                            <div>
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">Old Data</h4>
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-[13px] overflow-x-auto text-slate-700 max-h-64">
                                {row.old_data ? renderDataAsText(formatData(row.old_data, row.entity_type)) : <span className="text-slate-400 italic">No previous data</span>}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">New Data</h4>
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-[13px] overflow-x-auto text-slate-700 max-h-64">
                                {row.new_data ? renderDataAsText(formatData(row.new_data, row.entity_type)) : <span className="text-slate-400 italic">No new data</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })
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
