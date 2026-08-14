"use client";

import { useState } from "react";
import { TaxCategory, TaxRate } from "@/modules/taxes/schemas/tax.schema";
import { TaxCategoryDialog } from "./tax-category-dialog";
import { DeleteTaxDialog } from "./delete-tax-dialog";
import { TaxRatesPanel } from "./tax-rates-panel";
import { 
  Tag, 
  Percent, 
  AlignLeft, 
  Activity, 
  Plus,
  Search,
  Layers,
  X,
  Edit2,
  Trash2,
  Settings2
} from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface TaxesTableProps {
  categories: TaxCategory[];
  rates: TaxRate[];
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";
  const style = isActive 
    ? { bg: "bg-[#eafff5]", text: "text-[#008a5e]", border: "border-[#a7f3d0]", dot: "bg-[#059669]", label: "Active" }
    : { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500", label: "Inactive" };

  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[13px] font-semibold tracking-tight whitespace-nowrap ${style.bg} ${style.border} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span>{style.label}</span>
    </span>
  );
}

export function TaxesTable({ categories, rates }: TaxesTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<TaxCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<TaxCategory | null>(null);
  const [ratesCategory, setRatesCategory] = useState<TaxCategory | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeSort, setActiveSort] = useState("name-asc");

  // Filter and Sort Logic
  const filtered = categories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || category.status === statusFilter;
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
    ? categories.length 
    : categories.filter(c => c.status === status).length;

  const tabs = [
    { id: "ALL", label: "All Tax Rules" },
    { id: "ACTIVE", label: "Active" },
    { id: "INACTIVE", label: "Inactive" },
  ];

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

      <div id="taxes-table" className="bg-white shadow-xs overflow-hidden rounded-xl border border-slate-200">
        
        {/* Top View Tabs (Airtable / Linear Style) */}
        <div className="flex items-center gap-1 bg-slate-50/70 px-4 pt-2.5 overflow-x-auto select-none border-b border-slate-200/80">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-white text-slate-900 border border-b-white border-slate-200/90 shadow-2xs font-semibold -mb-px z-10"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                statusFilter === tab.id ? "bg-slate-100 text-slate-500" : "text-slate-400"
              }`}>
                {getCount(tab.id)}
              </span>
            </button>
          ))}
          
          <div className="h-4 w-px bg-slate-200/80 mx-1" />
          
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 rounded-t-lg px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
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
              placeholder="Search Tax Category..."
              className="w-full rounded-md border border-slate-200/80 bg-slate-50/50 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-emerald-500/20 transition-all"
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
              <Percent className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-[14px] font-medium text-slate-900">No Tax Categories</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                You don't have any tax rules matching these filters. Try adjusting your search or add a new one.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/50 text-xs font-semibold text-slate-700">
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[25%]"><div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-slate-400" />Name</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]"><div className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5 text-slate-400" />Current Rate</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[30%]"><div className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5 text-slate-400" />Description</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-slate-400" />Status</div></th>
                  <th className="py-2.5 px-4 text-right w-[10%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs font-normal text-slate-800">
                {filtered.map((category) => (
                  <tr key={category.id} className="border-b border-slate-200/80 hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                      {category.name}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <span>{getCurrentRate(category.id)}</span>
                        {getFutureRatesCount(category.id) > 0 && (
                          <span className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 border border-sky-200/60" title="Future rate configured">
                            + future
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 text-slate-600 truncate max-w-[250px]">
                      {category.description || "-"}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80">
                      <StatusBadge status={category.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setRatesCategory(category)}
                          className="flex items-center gap-1 rounded p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer mr-2"
                          title="Manage Rates"
                        >
                          <Settings2 className="h-4 w-4" />
                          <span className="text-[10px] font-medium uppercase tracking-wider">Rates</span>
                        </button>
                        <button
                          onClick={() => setEditCategory(category)}
                          className="rounded p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                          title="Edit Tax Category"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteCategory(category)}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Tax Category"
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
