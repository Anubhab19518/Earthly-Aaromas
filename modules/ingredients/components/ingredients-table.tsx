"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Package,
  Hash,
  Tag,
  Scale,
  IndianRupee,
  Activity,
  X,
  Edit2,
  Trash2,
  ArrowRightLeft,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { Ingredient, IngredientCategory } from "@/modules/ingredients/schemas/ingredient.schema";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { IngredientDialog } from "./ingredient-dialog";
import { DeleteIngredientDialog } from "./delete-ingredient-dialog";
import { CategoryDialog } from "./category-dialog";
import { ConversionsPanel } from "./conversions-panel";
import { IngredientCategoriesSection } from "./ingredient-categories-section";
import { AlertPoliciesPanel } from "@/modules/inventory/components/alert-policies-panel";
import { Location } from "@/modules/locations/schemas/location.schema";
import { InventoryAlertPolicy } from "@/modules/inventory/schemas/alert-policy.schema";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface IngredientsTableProps {
  ingredients: Ingredient[];
  categories: IngredientCategory[];
  units: Unit[];
  conversions: IngredientUnitConversion[];
  locations: Location[];
  alertPolicies: InventoryAlertPolicy[];
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
      <span
        className={`h-2 w-2 rounded-[2px] shrink-0 ${
          isActive ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      <span>{isActive ? "Active" : "Inactive"}</span>
    </div>
  );
}

export function IngredientsTable({
  ingredients,
  categories,
  units,
  conversions,
  locations,
  alertPolicies,
}: IngredientsTableProps) {
  // Dialog & Drawer States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editIngredient, setEditIngredient] = useState<Ingredient | null>(null);
  const [deleteIngredient, setDeleteIngredient] = useState<Ingredient | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [conversionsIngredient, setConversionsIngredient] = useState<Ingredient | null>(null);
  const [alertsIngredient, setAlertsIngredient] = useState<Ingredient | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [activeSort, setActiveSort] = useState("name-asc");

  // Helper Lookups
  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? "-";

  const getBaseUnit = (unitId: string | null | undefined) =>
    units.find((u) => u.id === unitId);

  const getConversionCount = (ingredientId: string) =>
    conversions.filter((c) => c.ingredient_id === ingredientId).length;

  const getAlertCount = (ingredientId: string) =>
    alertPolicies.filter((p) => p.ingredient_id === ingredientId).length;

  // Tab counts
  const getCount = (tabId: string) => {
    if (tabId === "ALL") return ingredients.length;
    if (tabId === "ACTIVE") return ingredients.filter((i) => i.status === "ACTIVE").length;
    if (tabId === "PERISHABLE") return ingredients.filter((i) => i.is_perishable).length;
    if (tabId === "CONVERSIONS")
      return ingredients.filter((i) => conversions.some((c) => c.ingredient_id === i.id)).length;
    if (tabId === "ALERTS")
      return ingredients.filter((i) => alertPolicies.some((p) => p.ingredient_id === i.id)).length;
    if (tabId === "INACTIVE") return ingredients.filter((i) => i.status === "INACTIVE").length;
    return 0;
  };

  const tabs = [
    { id: "ALL", label: "All Items" },
    { id: "ACTIVE", label: "Active" },
    { id: "PERISHABLE", label: "Perishable" },
    { id: "CONVERSIONS", label: "With Conversions" },
    { id: "ALERTS", label: "With Alert Rules" },
    { id: "INACTIVE", label: "Inactive" },
  ];

  // Filter and Sort Logic
  const filtered = useMemo(() => {
    return ingredients
      .filter((ing) => {
        // Tab Filter
        if (statusFilter === "ACTIVE" && ing.status !== "ACTIVE") return false;
        if (statusFilter === "INACTIVE" && ing.status !== "INACTIVE") return false;
        if (statusFilter === "PERISHABLE" && !ing.is_perishable) return false;
        if (statusFilter === "CONVERSIONS" && getConversionCount(ing.id) === 0) return false;
        if (statusFilter === "ALERTS" && getAlertCount(ing.id) === 0) return false;

        // Category Filter
        if (categoryFilter !== "ALL" && ing.category_id !== categoryFilter) return false;

        // Search Query
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesName = ing.name.toLowerCase().includes(q);
          const matchesSku = ing.sku?.toLowerCase().includes(q);
          const catName = getCategoryName(ing.category_id).toLowerCase();
          if (!matchesName && !matchesSku && !catName.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const [by, dir] = activeSort.split("-");
        const mod = dir === "asc" ? 1 : -1;
        if (by === "name") return a.name.localeCompare(b.name) * mod;
        if (by === "sku") return (a.sku || "").localeCompare(b.sku || "") * mod;
        if (by === "status") return a.status.localeCompare(b.status) * mod;
        if (by === "cost")
          return ((Number(a.standard_cost) || 0) - (Number(b.standard_cost) || 0)) * mod;
        return 0;
      });
  }, [
    ingredients,
    statusFilter,
    categoryFilter,
    searchTerm,
    activeSort,
    conversions,
    alertPolicies,
  ]);

  return (
    <div className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Master Data & Inventory"
        title="Raw Materials & Ingredients Master"
        description="Catalog raw materials, SKUs, standard costs, yield percentages, and base measurement units"
        icon={Package}
        iconBgColor="bg-blue-600 text-white"
        colorTheme="blue"
        tabs={[
          { id: "ingredients-table", label: "Ingredients Directory", icon: Package, count: ingredients.length },
          { id: "ingredient-categories", label: "Categories Master", icon: Tag, count: categories.length },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <a
              href="#ingredient-categories"
              className="flex items-center gap-1.5 rounded-md border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Tag className="h-3.5 w-3.5 text-blue-600" />
              <span>Categories</span>
            </a>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Ingredient</span>
            </button>
          </div>
        }
      />

      <div id="ingredients-table" className="bg-white shadow-xs overflow-hidden rounded-md border border-slate-200">
        {/* Top View Tabs (Airtable / Linear Style matching other pages) */}
        <div className="flex items-center gap-1 bg-slate-50/70 pl-0 pr-4 pt-2.5 overflow-x-auto select-none border-b border-slate-200/80">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-md px-4 py-2 text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? "relative bg-white text-slate-900 border border-slate-200/90 border-b-transparent shadow-2xs font-medium translate-y-[1px] z-10"
                  : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-md text-[10px] font-mono font-medium shrink-0 ${
                  statusFilter === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {getCount(tab.id)}
              </span>
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200/80 mx-1" />

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 rounded-t-md px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 transition-all duration-200 cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>New</span>
          </button>
        </div>

        {/* Inline Toolbar matching other ERP pages */}
        <div className="flex flex-col gap-2.5 border-b border-slate-200/80 bg-white px-4 py-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3 overflow-x-auto py-0.5">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium text-slate-700">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer hover:text-slate-900 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

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
                <option value="sku-asc">SKU (A-Z)</option>
                <option value="sku-desc">SKU (Z-A)</option>
                <option value="cost-desc">Cost (High-Low)</option>
                <option value="cost-asc">Cost (Low-High)</option>
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
              placeholder="Search by Name or SKU..."
              className="w-full rounded-md border border-slate-200/80 bg-slate-50/50 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all"
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

        {/* Data Table */}
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Package className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-sm font-medium text-slate-900">No Ingredients Found</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                You don&apos;t have any ingredients matching these filters. Try adjusting your search or add a new one.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/50 text-xs font-medium text-slate-600">
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[22%]">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>Name</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[11%]">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      <span>SKU</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[13%]">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>Category</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[12%]">
                    <div className="flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-slate-400" />
                      <span>Base Unit</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[10%]">
                    <div className="flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cost</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]">
                    <div className="flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                      <span>Rules & Units</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-4 w-[12%]">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-slate-400" />
                      <span>Status</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs font-normal text-slate-800">
                {filtered.map((ingredient) => {
                  const baseUnit = getBaseUnit(ingredient.base_unit_id);
                  const convCount = getConversionCount(ingredient.id);
                  const alertCount = getAlertCount(ingredient.id);

                  return (
                    <tr
                      key={ingredient.id}
                      className="border-b border-slate-200/80 hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Name with hover edit/delete actions */}
                      <td className="py-3 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                              {ingredient.name}
                            </span>
                            {ingredient.is_perishable && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200/80 bg-amber-50 px-1.5 py-0.2 text-[10px] font-medium text-amber-700" title="Perishable Ingredient">
                                <Flame className="h-2.5 w-2.5" />
                                <span>Fresh</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditIngredient(ingredient)}
                              className="rounded-md p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Edit Ingredient"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteIngredient(ingredient)}
                              className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Ingredient"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4 border-r border-slate-200/80">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200/80">
                          {ingredient.sku || "-"}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 border-r border-slate-200/80 text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium bg-white text-slate-700">
                          {getCategoryName(ingredient.category_id)}
                        </span>
                      </td>

                      {/* Base Unit */}
                      <td className="py-3 px-4 border-r border-slate-200/80 text-slate-700">
                        {baseUnit ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800">{baseUnit.name}</span>
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded-md">
                              {baseUnit.symbol}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Standard Cost */}
                      <td className="py-3 px-4 border-r border-slate-200/80 font-mono font-medium text-slate-900">
                        {ingredient.standard_cost != null
                          ? `₹${Number(ingredient.standard_cost).toFixed(2)}`
                          : "-"}
                      </td>

                      {/* Rules & Conversions */}
                      <td className="py-3 px-4 border-r border-slate-200/80">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConversionsIngredient(ingredient)}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Manage unit conversions"
                          >
                            <span
                              className={`h-2 w-2 rounded-[2px] shrink-0 ${
                                convCount > 0 ? "bg-blue-500" : "bg-slate-300"
                              }`}
                            />
                            <span>{convCount > 0 ? `${convCount} conv` : "Conv"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAlertsIngredient(ingredient)}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Manage low stock alert policies"
                          >
                            <span
                              className={`h-2 w-2 rounded-[2px] shrink-0 ${
                                alertCount > 0 ? "bg-amber-500" : "bg-slate-300"
                              }`}
                            />
                            <span>{alertCount > 0 ? `${alertCount} alert` : "Alert"}</span>
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={ingredient.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Ingredient Categories Master Section (Jira Style) */}
      <IngredientCategoriesSection
        categories={categories}
        ingredients={ingredients}
      />

      {/* Add / Edit Ingredient Dialog */}
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

      {/* Delete Ingredient Confirmation Dialog */}
      <DeleteIngredientDialog
        open={!!deleteIngredient}
        onOpenChange={(open) => !open && setDeleteIngredient(null)}
        ingredient={deleteIngredient}
      />

      {/* Add / Edit Category Dialog */}
      <CategoryDialog
        open={isCategoryOpen}
        onOpenChange={setIsCategoryOpen}
      />

      {/* Unit Conversions Slide-over Drawer */}
      {conversionsIngredient && (
        <ConversionsPanel
          ingredient={conversionsIngredient}
          conversions={conversions}
          units={units}
          open={!!conversionsIngredient}
          onClose={() => setConversionsIngredient(null)}
        />
      )}

      {/* Alert Policies Slide-over Drawer */}
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
  );
}
