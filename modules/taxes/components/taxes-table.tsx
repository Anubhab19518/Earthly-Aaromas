"use client";

import { useState } from "react";
import { TaxCategory, TaxRate } from "@/modules/taxes/schemas/tax.schema";
import { TaxCategoryDialog } from "./tax-category-dialog";
import { DeleteTaxDialog } from "./delete-tax-dialog";
import { TaxRatesPanel } from "./tax-rates-panel";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";
import { Tag, Percent, AlignLeft, Activity } from "lucide-react";

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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Tax Categories</h2>
          <p className="text-sm text-zinc-500">Configure GST classifications and their rates.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddOpen(true)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Add Category
          </button>
        </div>
      </div>

      <TableToolbar onSort={(dir) => setSortDir(dir)} />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="divide-x divide-zinc-200">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Name</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" />Current Rate</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" />Description</div>
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
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No tax categories found. Add your first category to get started.
                </td>
              </tr>
            ) : (
              sortedCategories.map((category) => (
                <tr key={category.id} className="hover:bg-zinc-50 divide-x divide-zinc-200">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                    {category.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-zinc-700">
                    {getCurrentRate(category.id)}
                    {getFutureRatesCount(category.id) > 0 && (
                      <span className="ml-2 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800" title="Future rate configured">
                        + future
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {category.description || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        category.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {category.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => setRatesCategory(category)}
                      className="mr-4 text-indigo-600 hover:text-indigo-900"
                    >
                      Rates
                    </button>
                    <button
                      onClick={() => setEditCategory(category)}
                      className="mr-4 text-zinc-600 hover:text-zinc-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteCategory(category)}
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
  );
}

