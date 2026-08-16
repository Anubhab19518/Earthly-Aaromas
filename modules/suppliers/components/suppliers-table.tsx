"use client";

import { useState } from "react";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { SupplierDialog } from "./supplier-dialog";
import { DeleteSupplierDialog } from "./delete-supplier-dialog";
import { 
  Building2, 
  Phone, 
  FileText, 
  Activity, 
  Truck, 
  Plus,
  Search,
  Layers,
  X,
  Edit2,
  Trash2
} from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface SuppliersTableProps {
  suppliers: Supplier[];
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
      <span className={`h-2 w-2 rounded-[2px] shrink-0 ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
      <span>{isActive ? "Active" : "Inactive"}</span>
    </div>
  );
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeSort, setActiveSort] = useState("name-asc");

  // Filter and Sort Logic
  const filtered = suppliers.filter((supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (supplier.gstin && supplier.gstin.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || supplier.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "name") return a.name.localeCompare(b.name) * mod;
    if (by === "status") return a.status.localeCompare(b.status) * mod;
    return 0;
  });

  // Calculate counts for tabs
  const getCount = (status: string) => status === "ALL" 
    ? suppliers.length 
    : suppliers.filter(s => s.status === status).length;

  const tabs = [
    { id: "ALL", label: "All Suppliers" },
    { id: "ACTIVE", label: "Active" },
    { id: "INACTIVE", label: "Inactive" },
  ];

  return (
    <div className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Vendor & Procurement"
        title="Suppliers & Vendor Directory"
        description="Maintain approved vendor records, GSTIN details, payment terms, and contact information"
        icon={Truck}
        iconBgColor="bg-violet-600 text-white"
        tabs={[
          { id: "suppliers-table", label: "Supplier Directory", icon: Truck, count: suppliers.length },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Supplier</span>
          </button>
        }
      />

      <div id="suppliers-table" className="bg-white shadow-xs overflow-hidden rounded-xl border border-slate-200">
        
        {/* Top View Tabs (Airtable / Linear Style) */}
        <div className="flex items-center gap-1 bg-slate-50/70 pl-0 pr-4 pt-2.5 overflow-x-auto select-none border-b border-slate-200/80">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? "relative bg-white text-slate-900 border border-slate-200/90 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                  : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
              }`}
            >
              <span>{tab.label}</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
                {getCount(tab.id)}
              </span>
            </button>
          ))}
          
          <div className="h-4 w-px bg-slate-200/80 mx-1" />
          
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 rounded-t-lg px-3 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 transition-all duration-300 ease-in-out cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>New</span>
          </button>
        </div>

        {/* Inline Toolbar */}
        <div className="flex flex-col gap-2.5 border-b border-slate-200/80 bg-white px-4 py-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3 overflow-x-auto py-0.5">
            <button className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>Grouping</span>
            </button>

            <div className="h-3.5 w-px bg-slate-200" />

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-700">Sort:</span>
              <select
                value={activeSort}
                onChange={(e) => setActiveSort(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer hover:text-slate-900 focus:outline-none"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="status-asc">Status (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name or GSTIN..."
              className="w-full rounded-md border border-slate-200/80 bg-slate-50/50 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Building2 className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-[14px] font-medium text-slate-900">No Suppliers</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                You don't have any suppliers matching these filters. Try adjusting your search or add a new one.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/50 text-xs font-semibold text-slate-700">
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[25%]"><div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" />Name</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[25%]"><div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />Contact Info</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]"><div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-400" />GSTIN</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-slate-400" />Status</div></th>
                  <th className="py-2.5 px-4 text-right w-[15%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs font-normal text-slate-800">
                {filtered.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-slate-200/80 hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                      {supplier.name}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 text-slate-600">
                      {supplier.email && <div>{supplier.email}</div>}
                      {supplier.phone && <div>{supplier.phone}</div>}
                      {!supplier.email && !supplier.phone && "-"}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 font-mono text-xs text-slate-600">
                      {supplier.gstin || "-"}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80">
                      <StatusBadge status={supplier.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditSupplier(supplier)}
                          className="rounded p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition-colors cursor-pointer"
                          title="Edit Supplier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteSupplier(supplier)}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Supplier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SupplierDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
      />

      <SupplierDialog
        open={!!editSupplier}
        onOpenChange={(open) => !open && setEditSupplier(null)}
        supplier={editSupplier || undefined}
      />

      <DeleteSupplierDialog
        open={!!deleteSupplier}
        onOpenChange={(open) => !open && setDeleteSupplier(null)}
        supplier={deleteSupplier}
      />
    </div>
  );
}

