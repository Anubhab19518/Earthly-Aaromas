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

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="divide-x divide-zinc-200">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />Name</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Contact Info</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />GSTIN</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />Status</div>
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No suppliers found. Add your first supplier to get started.
                </td>
              </tr>
            ) : (
              sortedSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-zinc-50 divide-x divide-zinc-200">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                    {supplier.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    {supplier.email && <div>{supplier.email}</div>}
                    {supplier.phone && <div>{supplier.phone}</div>}
                    {!supplier.email && !supplier.phone && "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-500">
                    {supplier.gstin || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        supplier.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {supplier.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => setEditSupplier(supplier)}
                      className="mr-4 text-zinc-600 hover:text-zinc-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteSupplier(supplier)}
                      className="text-red-600 hover:text-red-900"
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

