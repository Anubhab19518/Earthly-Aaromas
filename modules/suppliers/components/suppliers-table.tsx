"use client";

import { useState } from "react";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { SupplierDialog } from "./supplier-dialog";
import { DeleteSupplierDialog } from "./delete-supplier-dialog";
import { Building2, Phone, FileText, Activity, Truck, Plus } from "lucide-react";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface SuppliersTableProps {
  suppliers: Supplier[];
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    const valA = a.name.toLowerCase();
    const valB = b.name.toLowerCase();
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

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

      <div id="suppliers-table" className="space-y-4">

      <TableToolbar onSort={(dir) => setSortDir(dir)} />

      <div className="rounded-md border border-neutral-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/60 text-xs font-semibold text-neutral-700">
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-neutral-400" />Name</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-neutral-400" />Contact Info</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-neutral-400" />GSTIN</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-neutral-400" />Status</div>
                </th>
                <th className="py-2.5 px-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs font-normal text-neutral-800">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No suppliers found. Add your first supplier to get started.
                </td>
              </tr>
            ) : (
              sortedSuppliers.map((supplier) => (
                <tr key={supplier.id} className="h-11 border-b border-neutral-200 transition-colors group hover:bg-neutral-50/80">
                  <td className="py-2.5 px-4 border-r border-neutral-200 font-medium text-neutral-900">
                    {supplier.name}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    {supplier.email && <div>{supplier.email}</div>}
                    {supplier.phone && <div>{supplier.phone}</div>}
                    {!supplier.email && !supplier.phone && "-"}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 font-mono text-xs text-neutral-600">
                    {supplier.gstin || "-"}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        supplier.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-red-50 text-red-700 border-red-200/60"
                      }`}
                    >
                      {supplier.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => setEditSupplier(supplier)}
                      className="mr-4 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteSupplier(supplier)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
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
    </div>
  );
}

