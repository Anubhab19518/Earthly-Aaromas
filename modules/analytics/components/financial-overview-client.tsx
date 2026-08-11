"use client";

import { format } from "date-fns";
import Link from "next/link";
import { DollarSign, Truck, ShoppingCart, ArrowRight } from "lucide-react";

interface FinancialOverviewClientProps {
  overview: {
    totalPoValue: number;
    totalGrnValue: number;
    totalSalesRevenue: number;
    recentGrns: any[];
  };
}

export function FinancialOverviewClient({ overview }: FinancialOverviewClientProps) {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Financial & Transaction Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">High-level visibility into procurement and sales</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col items-center text-center justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Truck className="w-24 h-24 text-blue-600" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">Total Procurement (POs)</p>
          <p className="text-4xl font-bold text-zinc-900">₹{overview.totalPoValue.toFixed(2)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col items-center text-center justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Truck className="w-24 h-24 text-amber-600" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">Total Received (GRNs)</p>
          <p className="text-4xl font-bold text-zinc-900">₹{overview.totalGrnValue.toFixed(2)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col items-center text-center justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingCart className="w-24 h-24 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">Total Sales Revenue</p>
          <p className="text-4xl font-bold text-sky-700">₹{overview.totalSalesRevenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden mt-8">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-5">
          <h2 className="text-base font-semibold text-zinc-900">Supply Chain Traceability (Recent Receipts)</h2>
          <p className="text-sm text-zinc-500 mt-1">Trace received goods back to their original purchase orders.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr className="divide-x divide-zinc-200">
                <th className="px-6 py-4 font-semibold">Goods Receipt</th>
                <th className="px-6 py-4 font-semibold">Supplier</th>
                <th className="px-6 py-4 font-semibold">Received Date</th>
                <th className="px-6 py-4 font-semibold">Traceability</th>
                <th className="px-6 py-4 font-semibold">Linked PO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {overview.recentGrns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No recent goods receipts found.
                  </td>
                </tr>
              ) : (
                overview.recentGrns.map((grn) => (
                  <tr key={grn.id} className="hover:bg-zinc-50 transition-colors divide-x divide-zinc-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/receiving/${grn.id}`} className="font-medium text-sky-700 hover:underline">
                        {grn.grn_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-900">
                      {grn.suppliers?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-500">
                      {format(new Date(grn.received_date), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                      <ArrowRight className="h-4 w-4" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {grn.purchase_order_id ? (
                        <Link href={`/purchase-orders/${grn.purchase_order_id}`} className="font-medium text-blue-600 hover:underline">
                          {grn.purchase_orders?.po_number}
                        </Link>
                      ) : (
                        <span className="text-zinc-400 italic">Direct Receipt</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
