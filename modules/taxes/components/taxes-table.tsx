"use client";

import { useState } from "react";
import { TaxCategory, TaxRate } from "@/modules/taxes/schemas/tax.schema";
import { TaxCategoryDialog } from "./tax-category-dialog";
import { DeleteTaxDialog } from "./delete-tax-dialog";
import { TaxRatesPanel } from "./tax-rates-panel";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";
import { Tag, Percent, AlignLeft, Activity, Plus } from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface TaxesTableProps {
  categories: TaxCategory[];
  rates: TaxRate[];
}

export function TaxesTable({ categories, rates }: TaxesTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<TaxCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<TaxCategory | null>(null);
  const [ratesCategory, setRatesCategory] = useState<TaxCategory | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedCategories = [...categories].sort((a, b) => {
    const valA = a.name.toLowerCase();
    const valB = b.name.toLowerCase();
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const getCurrentRate = (categoryId: string) => {
    const categoryRates = rates
      .filter((r) => r.tax_category_id === categoryId)
      .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());

    const today = new Date().toISOString().split("T")[0];
    const activeRate = categoryRates.find((r) => r.effective_from <= today);

    return activeRate ? Number(activeRate.rate_percentage).toFixed(2) + "%" : "No active rate";
  };

  const getFutureRatesCount = (categoryId: string) => {
    const today = new Date().toISOString().split("T")[0];
    return rates.filter((r) => r.tax_category_id === categoryId && r.effective_from > today).length;
  };

  return (
    <div className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Finance & Compliance"
        title="Tax Rules & GST Classifications"
        description="Configure tax categories, HSN/SAC codes, effective rate schedules, and GST rules"
        icon={Percent}
        iconBgColor="bg-emerald-600 text-white"
        tabs={[
          { id: "taxes-table", label: "Tax Categories & Rates", icon: Percent, count: categories.length },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Tax Category</span>
          </button>
        }
      />

      <div id="taxes-table" className="space-y-4">

      <TableToolbar onSort={(dir) => setSortDir(dir)} />

      <div className="rounded-md border border-neutral-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/60 text-xs font-semibold text-neutral-700">
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-neutral-400" />Name</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5 text-neutral-400" />Current Rate</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5 text-neutral-400" />Description</div>
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
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No tax categories found. Add your first category to get started.
                </td>
              </tr>
            ) : (
              sortedCategories.map((category) => (
                <tr key={category.id} className="h-11 border-b border-neutral-200 transition-colors group hover:bg-neutral-50/80">
                  <td className="py-2.5 px-4 border-r border-neutral-200 font-medium text-neutral-900">
                    {category.name}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 font-semibold text-neutral-700">
                    {getCurrentRate(category.id)}
                    {getFutureRatesCount(category.id) > 0 && (
                      <span className="ml-2 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200/60" title="Future rate configured">
                        + future
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    {category.description || "-"}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        category.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-red-50 text-red-700 border-red-200/60"
                      }`}
                    >
                      {category.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => setRatesCategory(category)}
                      className="mr-4 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Rates
                    </button>
                    <button
                      onClick={() => setEditCategory(category)}
                      className="mr-4 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteCategory(category)}
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

      <TaxCategoryDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
      />

      <TaxCategoryDialog
        open={!!editCategory}
        onOpenChange={(open) => !open && setEditCategory(null)}
        category={editCategory || undefined}
      />

      <DeleteTaxDialog
        open={!!deleteCategory}
        onOpenChange={(open) => !open && setDeleteCategory(null)}
        category={deleteCategory}
      />

      {ratesCategory && (
        <TaxRatesPanel
          category={ratesCategory}
          rates={rates}
          open={!!ratesCategory}
          onClose={() => setRatesCategory(null)}
        />
      )}
      </div>
    </div>
  );
}

