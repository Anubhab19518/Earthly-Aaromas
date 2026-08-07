"use client";

import { useState } from "react";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { SupplierDialog } from "./supplier-dialog";
import { DeleteSupplierDialog } from "./delete-supplier-dialog";

interface SuppliersTableProps {
  suppliers: Supplier[];
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Suppliers</h2>
          <p className="text-sm text-zinc-500">Manage your organization's suppliers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddOpen(true)}
            className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a4f20]"
          >
            Add Supplier
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Contact Info
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                GSTIN
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Status
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
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-zinc-50">
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
  );
}

