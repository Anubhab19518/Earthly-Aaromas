"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Search, Filter } from "lucide-react";

interface InventoryLedgerClientProps {
  initialData: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  locations: any[];
  ingredients: any[];
  activeBranchId?: string;
}

const TRANSACTION_TYPES = [
  "GOODS_RECEIPT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "SALE",
  "RECIPE_CONSUMPTION",
  "STOCK_ADJUSTMENT",
  "WASTAGE",
  "RETURN"
];

export function InventoryLedgerClient({
  initialData,
  totalCount,
  totalPages,
  currentPage,
  locations,
  ingredients,
  activeBranchId
}: InventoryLedgerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [transactionType, setTransactionType] = useState(searchParams.get("transaction_type") || "");
  const [ingredientId, setIngredientId] = useState(searchParams.get("ingredient_id") || "");
  const [locationId, setLocationId] = useState(searchParams.get("location_id") || (activeBranchId || ""));

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const getReferenceLink = (type: string, id: string) => {
    if (!id) return "#";
    switch (type) {
      case "GOODS_RECEIPT":
        return `/receiving/${id}`;
      case "TRANSFER_IN":
      case "TRANSFER_OUT":
        return `/stock-transfers/${id}`;
      case "SALE":
        return `/orders/${id}`; // Future sales reference
      default:
        return "#";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Inventory Ledger</h1>
          <p className="mt-1 text-sm text-zinc-500">Immutable record of all inventory movements</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-zinc-900">
          <Filter className="h-4 w-4 text-zinc-500" />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!activeBranchId && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Location</label>
              <select
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#587333] focus:outline-none focus:ring-1 focus:ring-[#587333]"
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  updateFilters("location_id", e.target.value);
                }}
              >
                <option value="">All Locations</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Ingredient</label>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#587333] focus:outline-none focus:ring-1 focus:ring-[#587333]"
              value={ingredientId}
              onChange={(e) => {
                setIngredientId(e.target.value);
                updateFilters("ingredient_id", e.target.value);
              }}
            >
              <option value="">All Ingredients</option>
              {ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Transaction Type</label>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#587333] focus:outline-none focus:ring-1 focus:ring-[#587333]"
              value={transactionType}
              onChange={(e) => {
                setTransactionType(e.target.value);
                updateFilters("transaction_type", e.target.value);
              }}
            >
              <option value="">All Types</option>
              {TRANSACTION_TYPES.map(type => (
                <option key={type} value={type}>{type.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Date & Time</th>
                <th className="px-6 py-4 font-semibold">Ingredient</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Transaction Type</th>
                <th className="px-6 py-4 text-right font-semibold">Change</th>
                <th className="px-6 py-4 font-semibold">Reference</th>
                <th className="px-6 py-4 font-semibold">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {initialData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    No ledger entries found.
                  </td>
                </tr>
              ) : (
                initialData.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-zinc-900">{format(new Date(row.created_at), "MMM d, yyyy")}</div>
                      <div className="text-xs text-zinc-500">{format(new Date(row.created_at), "h:mm a")}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-zinc-900">
                      {row.ingredients?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {row.locations?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                        {row.transaction_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`font-bold flex items-center justify-end gap-1 ${row.quantity_change > 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {row.quantity_change > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        {Math.abs(row.quantity_change).toFixed(2)} {row.units?.symbol}
                      </div>
                      {row.running_cost && (
                        <div className="text-xs text-zinc-500 mt-1">₹{Number(row.running_cost).toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {row.reference_type && (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-zinc-400">{row.reference_type}</span>
                          {row.reference_id ? (
                            <Link href={getReferenceLink(row.reference_type, row.reference_id)} className="text-sm font-medium text-[#587333] hover:underline">
                              {row.formatted_reference || row.reference_id}
                            </Link>
                          ) : (
                            <span className="text-sm text-zinc-500">No ref ID</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {row.profiles?.full_name || "System"}
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
