"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  Plus, 
  MapPin, 
  Tag, 
  Package, 
  Hash, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  AlertOctagon,
  Database,
  X,
  SlidersHorizontal,
  PackageSearch,
  ArrowRight
} from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";
import { InventorySnapshot } from "@/modules/inventory/schemas/inventory.schema";
import { Ingredient, IngredientCategory } from "@/modules/ingredients/schemas/ingredient.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { InventoryAlertPolicy } from "@/modules/inventory/schemas/alert-policy.schema";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

interface InventoryDashboardProps {
  snapshots: InventorySnapshot[];
  ingredients: Ingredient[];
  categories: IngredientCategory[];
  locations: Location[];
  units: Unit[];
  alertPolicies: InventoryAlertPolicy[];
}

export function InventoryDashboard({
  snapshots,
  ingredients,
  categories,
  locations,
  units,
  alertPolicies,
}: InventoryDashboardProps) {
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "healthy" | "alerts" | "oos">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedSnapshotForAdjustment, setSelectedSnapshotForAdjustment] = useState<InventorySnapshot | null>(null);

  const [columns, setColumns] = useState([
    { key: "location", label: "Location", visible: true },
    { key: "category", label: "Category", visible: true },
    { key: "ingredient", label: "Ingredient", visible: true },
    { key: "qty", label: "Current Qty", visible: true },
    { key: "status", label: "Status", visible: true },
    { key: "last_update", label: "Last Update", visible: true },
  ]);

  const toggleColumn = (key: string) =>
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));

  const col = (key: string) => columns.find((c) => c.key === key)?.visible ?? true;

  const [activeSort, setActiveSort] = useState("location-asc");

  const sortOptions = [
    { label: "Location (A to Z)", value: "location-asc" },
    { label: "Location (Z to A)", value: "location-desc" },
    { label: "Ingredient (A to Z)", value: "ingredient-asc" },
    { label: "Ingredient (Z to A)", value: "ingredient-desc" },
    { label: "Quantity (High to Low)", value: "qty-desc" },
    { label: "Quantity (Low to High)", value: "qty-asc" },
    { label: "Last Updated (Newest)", value: "date-desc" },
    { label: "Last Updated (Oldest)", value: "date-asc" },
  ];

  // Helper to determine status key and labels without uppercase
  const getStatusInfo = (snapshot: InventorySnapshot) => {
    const policy = alertPolicies.find(
      (p) => p.ingredient_id === snapshot.ingredient_id && p.location_id === snapshot.location_id
    );

    if (!policy) return { key: "ok", label: "Healthy" };

    const qty = Number(snapshot.quantity_on_hand);
    if (qty <= Number(policy.out_of_stock_level)) {
      return { key: "oos", label: "Out of stock" };
    }
    if (qty <= Number(policy.critical_level)) {
      return { key: "critical", label: "Critical stock" };
    }
    if (qty <= Number(policy.warning_level)) {
      return { key: "warning", label: "Low stock" };
    }

    return { key: "ok", label: "Healthy" };
  };

  // Metrics computation
  const metrics = useMemo(() => {
    let healthy = 0;
    let warning = 0;
    let criticalOrOos = 0;
    let oos = 0;

    const locationSet = new Set<string>();

    snapshots.forEach((s) => {
      locationSet.add(s.location_id);
      const status = getStatusInfo(s);
      if (status.key === "ok") healthy++;
      else if (status.key === "warning") warning++;
      else if (status.key === "critical" || status.key === "oos") {
        criticalOrOos++;
        if (status.key === "oos") oos++;
      }
    });

    return {
      total: snapshots.length,
      healthy,
      warning,
      criticalOrOos,
      oos,
      activeLocationsCount: locationSet.size,
    };
  }, [snapshots, alertPolicies]);

  // Tab count metrics
  const tabCounts = useMemo(() => {
    return {
      all: snapshots.length,
      healthy: metrics.healthy,
      alerts: metrics.warning + metrics.criticalOrOos,
      oos: metrics.oos,
    };
  }, [snapshots, metrics]);

  // Filtered & Sorted Snapshots
  const filteredSnapshots = useMemo(() => {
    return snapshots
      .filter((s) => {
        const location = locations.find((l) => l.id === s.location_id);
        const ingredient = ingredients.find((i) => i.id === s.ingredient_id);
        const category = categories.find((c) => c.id === ingredient?.category_id);
        const status = getStatusInfo(s);

        // Tab filter
        if (activeTab === "healthy" && status.key !== "ok") return false;
        if (activeTab === "alerts" && status.key === "ok") return false;
        if (activeTab === "oos" && status.key !== "oos") return false;

        // Dropdown filters
        if (locationFilter !== "all" && s.location_id !== locationFilter) return false;
        if (categoryFilter !== "all" && ingredient?.category_id !== categoryFilter) return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesLoc = location?.name.toLowerCase().includes(q);
          const matchesIng = ingredient?.name.toLowerCase().includes(q);
          const matchesCat = category?.name.toLowerCase().includes(q);
          if (!matchesLoc && !matchesIng && !matchesCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const [by, dir] = activeSort.split("-");
        const mod = dir === "asc" ? 1 : -1;
        if (by === "location") {
          const locA = locations.find((l) => l.id === a.location_id)?.name || "";
          const locB = locations.find((l) => l.id === b.location_id)?.name || "";
          return locA.localeCompare(locB) * mod;
        }
        if (by === "ingredient") {
          const ingA = ingredients.find((i) => i.id === a.ingredient_id)?.name || "";
          const ingB = ingredients.find((i) => i.id === b.ingredient_id)?.name || "";
          return ingA.localeCompare(ingB) * mod;
        }
        if (by === "qty") return (Number(a.quantity_on_hand) - Number(b.quantity_on_hand)) * mod;
        if (by === "date")
          return (new Date(a.last_movement_at).getTime() - new Date(b.last_movement_at).getTime()) * mod;
        return 0;
      });
  }, [
    snapshots,
    activeTab,
    locationFilter,
    categoryFilter,
    searchQuery,
    activeSort,
    locations,
    ingredients,
    categories,
    alertPolicies,
  ]);

  // Status badge renderer
  const renderStatusBadge = (snapshot: InventorySnapshot) => {
    const status = getStatusInfo(snapshot);

    if (status.key === "oos") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200/80 whitespace-nowrap shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
          <span>Out of stock</span>
        </span>
      );
    }
    if (status.key === "critical") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>Critical stock</span>
        </span>
      );
    }
    if (status.key === "warning") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>Low stock</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span>Healthy</span>
      </span>
    );
  };

  const hasActiveFilters = searchQuery !== "" || locationFilter !== "all" || categoryFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setLocationFilter("all");
    setCategoryFilter("all");
    setActiveTab("all");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Stock & Materials"
        title="Inventory Management"
        description="Real-time stock levels, low-stock alert monitoring, and ledger adjustments"
        icon={Package}
        iconBgColor="bg-indigo-600 text-white"
        tabs={[
          { id: "inventory-ledger-section", label: "Stock Ledger Master", icon: Database, count: snapshots.length },
          { 
            id: "inventory-alerts-section", 
            label: "Low Stock Alerts", 
            icon: AlertTriangle, 
            count: metrics.warning + metrics.criticalOrOos, 
            badgeColor: (metrics.warning + metrics.criticalOrOos) > 0 ? "bg-amber-100 text-amber-800" : undefined 
          },
        ]}
        actions={
          <button
            type="button"
            onClick={() => {
              setSelectedSnapshotForAdjustment(null);
              setIsAdjustmentOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adjust stock</span>
          </button>
        }
      />

      {/* Summary KPI Metric Cards (2 rows and 2 columns, financial page layout) */}
      <div id="inventory-kpis" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Card 1: Total Stock Items */}
        <div className="flex items-center gap-3.5 rounded-md border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-900">
            <Package className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">
              {metrics.total} total stock items
            </div>
            <div className="text-xs text-slate-500 font-normal mt-0.5 truncate">
              Across active ledgers
            </div>
          </div>
        </div>

        {/* Card 2: Healthy Stock */}
        <div className="flex items-center gap-3.5 rounded-md border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-900">
            <CheckCircle2 className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">
              {metrics.healthy} healthy stock items
            </div>
            <div className="text-xs text-slate-500 font-normal mt-0.5 truncate">
              Sufficient quantity on hand
            </div>
          </div>
        </div>

        {/* Card 3: Low Stock Warnings */}
        <div className="flex items-center gap-3.5 rounded-md border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-900">
            <AlertTriangle className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">
              {metrics.warning} low stock warnings
            </div>
            <div className="text-xs text-slate-500 font-normal mt-0.5 truncate">
              Near warning threshold level
            </div>
          </div>
        </div>

        {/* Card 4: Critical & Out of Stock */}
        <div className="flex items-center gap-3.5 rounded-md border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-900">
            <AlertOctagon className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">
              {metrics.criticalOrOos} critical & out of stock
            </div>
            <div className="text-xs text-slate-500 font-normal mt-0.5 truncate">
              Requires urgent reorder
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div id="inventory-ledger-section" className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        
        {/* Navigation View Tabs */}
        <div className="flex items-center gap-1 bg-slate-50/70 px-4 pt-2.5 overflow-x-auto select-none border-b border-slate-200/80">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === "all"
                ? "bg-white text-slate-900 border border-b-white border-slate-200/90 shadow-2xs font-semibold -mb-px z-10"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>All stock items</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {tabCounts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("healthy")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === "healthy"
                ? "bg-white text-slate-900 border border-b-white border-slate-200/90 shadow-2xs font-semibold -mb-px z-10"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Healthy stock</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
              {tabCounts.healthy}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === "alerts"
                ? "bg-white text-slate-900 border border-b-white border-slate-200/90 shadow-2xs font-semibold -mb-px z-10"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Low & critical alerts</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/60">
              {tabCounts.alerts}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("oos")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === "oos"
                ? "bg-white text-slate-900 border border-b-white border-slate-200/90 shadow-2xs font-semibold -mb-px z-10"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Out of stock</span>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200/60">
              {tabCounts.oos}
            </span>
          </button>
        </div>

        {/* Toolbar Bar */}
        <div className="flex flex-col gap-2.5 border-b border-slate-200/80 bg-white px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600">
          
          {/* Filters & Dropdowns */}
          <div className="flex items-center gap-3 overflow-x-auto py-0.5">
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ingredient, category..."
                className="w-full rounded-md border border-slate-200/80 bg-slate-50/50 pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Location Dropdown */}
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer hover:text-slate-900"
              >
                <option value="all">All locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer hover:text-slate-900"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors ml-1 cursor-pointer"
              >
                <span>Reset filters</span>
              </button>
            )}
          </div>

          {/* Table Toolbar Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <TableToolbar
              columns={columns}
              onColumnToggle={toggleColumn}
              sortOptions={sortOptions}
              activeSort={activeSort}
              onSortChange={setActiveSort}
            />
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/50 text-xs font-semibold text-slate-700">
                {col("location") && (
                  <th scope="col" className="py-3 px-4 border-r border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Location</span>
                    </div>
                  </th>
                )}
                {col("category") && (
                  <th scope="col" className="py-3 px-4 border-r border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>Category</span>
                    </div>
                  </th>
                )}
                {col("ingredient") && (
                  <th scope="col" className="py-3 px-4 border-r border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ingredient</span>
                    </div>
                  </th>
                )}
                {col("qty") && (
                  <th scope="col" className="py-3 px-4 border-r border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      <span>Current Qty</span>
                    </div>
                  </th>
                )}
                {col("status") && (
                  <th scope="col" className="py-3 px-4 border-r border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-slate-400" />
                      <span>Status</span>
                    </div>
                  </th>
                )}
                {col("last_update") && (
                  <th scope="col" className="py-3 px-4 border-r border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Last Update</span>
                    </div>
                  </th>
                )}
                <th scope="col" className="py-3 px-4 text-right">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/80 text-xs font-normal text-slate-800">
              {filteredSnapshots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageSearch className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No inventory records found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No stock snapshots match your current search terms or filter criteria.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          <span>Clear search & filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSnapshots.map((snapshot) => {
                  const location = locations.find((l) => l.id === snapshot.location_id);
                  const ingredient = ingredients.find((i) => i.id === snapshot.ingredient_id);
                  const category = categories.find((c) => c.id === ingredient?.category_id);
                  const unit = units.find((u) => u.id === ingredient?.base_unit_id);

                  return (
                    <tr
                      key={snapshot.id}
                      className="border-b border-slate-200/80 hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Location Cell */}
                      {col("location") && (
                        <td className="py-3.5 px-4 border-r border-slate-200/80 font-medium text-slate-900 whitespace-nowrap">
                          {location?.name || "—"}
                        </td>
                      )}

                      {/* Category Cell */}
                      {col("category") && (
                        <td className="py-3.5 px-4 border-r border-slate-200/80 text-slate-600 whitespace-nowrap font-medium">
                          {category?.name || "Uncategorized"}
                        </td>
                      )}

                      {/* Ingredient Cell */}
                      {col("ingredient") && (
                        <td className="py-3.5 px-4 border-r border-slate-200/80 font-semibold text-slate-900 whitespace-nowrap">
                          <span title={ingredient?.name}>{ingredient?.name || "—"}</span>
                        </td>
                      )}

                      {/* Quantity Cell */}
                      {col("qty") && (
                        <td className="py-3.5 px-4 border-r border-slate-200/80 whitespace-nowrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {Number(snapshot.quantity_on_hand)}
                          </span>
                          <span className="text-slate-500 font-normal ml-1">
                            {unit?.symbol || ""}
                          </span>
                        </td>
                      )}

                      {/* Status Cell */}
                      {col("status") && (
                        <td className="py-3.5 px-4 border-r border-slate-200/80 whitespace-nowrap">
                          {renderStatusBadge(snapshot)}
                        </td>
                      )}

                      {/* Last Update Cell */}
                      {col("last_update") && (
                        <td className="py-3.5 px-4 border-r border-slate-200/80 text-slate-600 whitespace-nowrap font-medium">
                          {new Intl.DateTimeFormat("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                            .format(new Date(snapshot.last_movement_at))
                            .replace(",", "")}
                        </td>
                      )}

                      {/* Actions Cell */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSnapshotForAdjustment(snapshot);
                            setIsAdjustmentOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200/60 transition-colors cursor-pointer shadow-2xs"
                        >
                          <span>Adjust</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 font-medium">
          <div>
            Showing <span className="font-semibold text-slate-700">{filteredSnapshots.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{snapshots.length}</span> inventory items
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Real-time stock master ledger</span>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal Dialog */}
      <StockAdjustmentDialog
        ingredients={ingredients}
        locations={locations}
        units={units}
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
      />
    </div>
  );
}
