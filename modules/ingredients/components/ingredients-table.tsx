"use client";

import { useState } from "react";
import { Plus, Search, Filter, Package, Hash, Tag, Scale, IndianRupee, Flag, Activity } from "lucide-react";
import { Ingredient, IngredientCategory } from "@/modules/ingredients/schemas/ingredient.schema";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { IngredientDialog } from "./ingredient-dialog";
import { DeleteIngredientDialog } from "./delete-ingredient-dialog";
import { CategoryDialog } from "./category-dialog";
import { CategoriesClient } from "./categories-client";
import { ConversionsPanel } from "./conversions-panel";
import { AlertPoliciesPanel } from "@/modules/inventory/components/alert-policies-panel";
import { Location } from "@/modules/locations/schemas/location.schema";
import { InventoryAlertPolicy } from "@/modules/inventory/schemas/alert-policy.schema";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface IngredientsTableProps {
  ingredients: Ingredient[];
  categories: IngredientCategory[];
  units: Unit[];
  conversions: IngredientUnitConversion[];
  locations: Location[];
  alertPolicies: InventoryAlertPolicy[];
}

export function IngredientsTable({
  ingredients,
  categories,
  units,
  conversions,
  locations,
  alertPolicies,
}: IngredientsTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editIngredient, setEditIngredient] = useState<Ingredient | null>(null);
  const [deleteIngredient, setDeleteIngredient] = useState<Ingredient | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [conversionsIngredient, setConversionsIngredient] = useState<Ingredient | null>(null);
  const [alertsIngredient, setAlertsIngredient] = useState<Ingredient | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeSort, setActiveSort] = useState("name-asc");

  const sortOptions = [
    { label: "Name (A-Z)", value: "name-asc" },
    { label: "Name (Z-A)", value: "name-desc" },
    { label: "SKU (A-Z)", value: "sku-asc" },
    { label: "SKU (Z-A)", value: "sku-desc" },
    { label: "Status (A-Z)", value: "status-asc" },
    { label: "Cost (High-Low)", value: "cost-desc" },
    { label: "Cost (Low-High)", value: "cost-asc" },
  ];
  const [showFilters, setShowFilters] = useState(false);

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? "-";

  const getUnitDisplay = (unitId: string | null | undefined) => {
    if (!unitId) return "-";
    const unit = units.find((u) => u.id === unitId);
    return unit ? `${unit.name} (${unit.symbol})` : "-";
  };

  const getConversionCount = (ingredientId: string) =>
    conversions.filter((c) => c.ingredient_id === ingredientId).length;

  const getAlertCount = (ingredientId: string) =>
    alertPolicies.filter((p) => p.ingredient_id === ingredientId).length;

  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (ing.sku && ing.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || ing.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "name") return a.name.localeCompare(b.name) * mod;
    if (by === "sku") return (a.sku || "").localeCompare(b.sku || "") * mod;
    if (by === "status") return a.status.localeCompare(b.status) * mod;
    if (by === "cost") return ((Number(a.standard_cost) || 0) - (Number(b.standard_cost) || 0)) * mod;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Master Data & Inventory"
        title="Raw Materials & Ingredients Master"
        description="Catalog raw materials, SKUs, standard costs, yield percentages, and base measurement units"
        icon={Package}
        iconBgColor="bg-emerald-600 text-white"
        tabs={[
          { id: "ingredients-table", label: "Ingredients Master", icon: Package, count: ingredients.length },
          { id: "ingredients-categories", label: "Categories", icon: Tag, count: categories.length },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCategoryOpen(true)}
              className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <span>Categories</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Ingredient</span>
            </button>
          </div>
        }
      />

      <div id="ingredients-table" className="space-y-4">

      <TableToolbar 
        sortOptions={sortOptions}
        activeSort={activeSort}
        onSortChange={setActiveSort}
        onFilter={() => setShowFilters(!showFilters)} 
      />

      {showFilters && (
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search ingredients by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border border-zinc-300 py-2 pl-10 pr-3 text-sm placeholder-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-300 py-2 pl-3 pr-8 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
      )}

      <div className="rounded-md border border-neutral-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/60 text-xs font-semibold text-neutral-700">
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-neutral-400" />Name</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-neutral-400" />SKU</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-neutral-400" />Category</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-neutral-400" />Base Unit</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-neutral-400" />Cost</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Flag className="w-3.5 h-3.5 text-neutral-400" />Flags</div>
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
            {filteredIngredients.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-zinc-500">
                  {ingredients.length === 0 
                    ? "No ingredients found. Add your first ingredient to get started."
                    : "No ingredients match your search criteria."}
                </td>
              </tr>
            ) : (
              filteredIngredients.map((ingredient) => (
                <tr key={ingredient.id} className="h-11 border-b border-neutral-200 transition-colors group hover:bg-neutral-50/80">
                  <td className="py-2.5 px-4 border-r border-neutral-200 font-medium text-neutral-900">
                    {ingredient.name}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 font-mono text-xs text-neutral-600">
                    {ingredient.sku}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    {getCategoryName(ingredient.category_id)}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    {getUnitDisplay(ingredient.base_unit_id)}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    {ingredient.standard_cost != null
                      ? `₹${Number(ingredient.standard_cost).toFixed(2)}`
                      : "-"}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200">
                    {ingredient.is_perishable && (
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border-amber-200/60">
                        Perishable
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        ingredient.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-red-50 text-red-700 border-red-200/60"
                      }`}
                    >
                      {ingredient.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => setAlertsIngredient(ingredient)}
                      className="mr-4 text-amber-600 hover:text-amber-800 font-medium"
                    >
                      Alerts
                      {getAlertCount(ingredient.id) > 0 && (
                        <span className="ml-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                          {getAlertCount(ingredient.id)}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setConversionsIngredient(ingredient)}
                      className="mr-4 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Conversions
                      {getConversionCount(ingredient.id) > 0 && (
                        <span className="ml-1 rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {getConversionCount(ingredient.id)}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setEditIngredient(ingredient)}
                      className="mr-4 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteIngredient(ingredient)}
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

      <IngredientDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        categories={categories}
        units={units}
      />

      <IngredientDialog
        open={!!editIngredient}
        onOpenChange={(open) => !open && setEditIngredient(null)}
        ingredient={editIngredient || undefined}
        categories={categories}
        units={units}
      />

      <DeleteIngredientDialog
        open={!!deleteIngredient}
        onOpenChange={(open) => !open && setDeleteIngredient(null)}
        ingredient={deleteIngredient}
      />

      <CategoryDialog
        open={isCategoryOpen}
        onOpenChange={setIsCategoryOpen}
      />

      {conversionsIngredient && (
        <ConversionsPanel
          ingredient={conversionsIngredient}
          conversions={conversions}
          units={units}
          open={!!conversionsIngredient}
          onClose={() => setConversionsIngredient(null)}
        />
      )}

      {alertsIngredient && (
        <AlertPoliciesPanel
          ingredient={alertsIngredient}
          baseUnit={units.find((u) => u.id === alertsIngredient.base_unit_id)!}
          locations={locations}
          policies={alertPolicies}
          open={!!alertsIngredient}
          onClose={() => setAlertsIngredient(null)}
        />
      )}
      </div>

      <div id="ingredients-categories">
        <CategoriesClient categories={categories} />
      </div>
    </div>
  );
}
