"use client";

import React, { useState, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { 
  Search, 
  X, 
  Check, 
  Copy, 
  Layers, 
  ArrowUpDown, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Zap, 
  Package,
  ShoppingCart,
  FileText,
  Utensils,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  ClipboardList
} from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface AuditLogClientProps {
  initialData: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  profiles: any[];
  entityTypes?: string[];
  ingredients?: any[];
  units?: any[];
  locations?: any[];
}

export interface DiffEntry {
  key: string;
  formattedKey: string;
  status: "added" | "removed" | "modified" | "unchanged";
  oldVal?: any;
  newVal?: any;
}

export function AuditLogClient({
  initialData,
  totalCount,
  totalPages,
  currentPage,
  profiles,
  entityTypes = [],
  ingredients = [],
  units = [],
  locations = [],
}: AuditLogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // State
  const [activeTab, setActiveTab] = useState<"all" | "inventory" | "orders" | "catalog">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actorIdFilter, setActorIdFilter] = useState(searchParams.get("actor_id") || "all");
  const [actionFilter, setActionFilter] = useState(searchParams.get("action") || "all");
  const [entityTypeFilter, setEntityTypeFilter] = useState(searchParams.get("entity_type") || "all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedItem(text);
    showToast(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const toggleRow = (id: string, hasChanges: boolean) => {
    if (!hasChanges) return;
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || !value) {
      params.delete("sort_by");
      params.delete("sort_order");
    } else {
      const [by, order] = value.split("-");
      params.set("sort_by", by);
      params.set("sort_order", order);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeSort = searchParams.get("sort_by")
    ? `${searchParams.get("sort_by")}-${searchParams.get("sort_order") || "desc"}`
    : "date-desc";

  // Filter dataset by search and active tab
  const filteredData = useMemo(() => {
    return initialData.filter((row) => {
      // Tab domain filtering
      if (activeTab === "inventory") {
        const invTypes = ["inventory_ledger", "goods_receipts", "stock_transfers"];
        if (!invTypes.includes(row.entity_type)) return false;
      } else if (activeTab === "orders") {
        const orderTypes = ["sales_orders", "purchase_orders"];
        if (!orderTypes.includes(row.entity_type)) return false;
      } else if (activeTab === "catalog") {
        const catalogTypes = ["menu_variants", "ingredients", "units", "locations"];
        if (!catalogTypes.includes(row.entity_type)) return false;
      }

      // Search query filtering
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const actorName = row.profiles?.full_name || "System";
      const actorEmail = row.profiles?.email || "";
      const actionStr = row.action || "";
      const entityTypeStr = row.entity_type || "";
      const entityIdStr = row.formatted_entity_id || row.entity_id || "";

      return (
        actorName.toLowerCase().includes(q) ||
        actorEmail.toLowerCase().includes(q) ||
        actionStr.toLowerCase().includes(q) ||
        entityTypeStr.toLowerCase().includes(q) ||
        entityIdStr.toLowerCase().includes(q)
      );
    });
  }, [initialData, activeTab, searchQuery]);

  // Tab counters
  const tabCounts = useMemo(() => {
    let inventory = 0;
    let orders = 0;
    let catalog = 0;

    initialData.forEach((row) => {
      const et = row.entity_type;
      if (["inventory_ledger", "goods_receipts", "stock_transfers"].includes(et)) inventory++;
      else if (["sales_orders", "purchase_orders"].includes(et)) orders++;
      else if (["menu_variants", "ingredients", "units", "locations"].includes(et)) catalog++;
    });

    return { all: totalCount, inventory, orders, catalog };
  }, [initialData, totalCount]);

  // Unique actions for drop-down filter
  const availableActions = useMemo(() => {
    const set = new Set<string>();
    initialData.forEach((d) => d.action && set.add(d.action));
    return Array.from(set);
  }, [initialData]);

  // Dynamic available entity types
  const availableEntityTypes = useMemo(() => {
    const set = new Set<string>([
      "inventory_ledger",
      "goods_receipts",
      "stock_transfers",
      "sales_orders",
      "purchase_orders",
      "ingredients",
      "menu_variants",
    ]);
    entityTypes.forEach((t) => set.add(t));
    initialData.forEach((d) => d.entity_type && set.add(d.entity_type));
    return Array.from(set);
  }, [entityTypes, initialData]);

  // Helper to format payload data object into clean label/value pairs
  const formatData = (data: any, entityType: string) => {
    if (!data || typeof data !== "object") return data;
    const formatted = { ...data };

    if (formatted.ingredient_id) {
      const ing = ingredients.find((i) => i.id === formatted.ingredient_id);
      if (ing) formatted.Ingredient = ing.name;
      delete formatted.ingredient_id;
    }
    if (formatted.location_id) {
      const loc = locations.find((l) => l.id === formatted.location_id);
      if (loc) formatted.Location = loc.name;
      delete formatted.location_id;
    }
    if (formatted.unit_id) {
      const unit = units.find((u) => u.id === formatted.unit_id);
      if (unit) formatted.Unit = `${unit.name} (${unit.symbol})`;
      delete formatted.unit_id;
    }
    if (formatted.actor_id) {
      const actor = profiles.find((p) => p.id === formatted.actor_id);
      if (actor) formatted.Actor = actor.full_name || actor.email;
      delete formatted.actor_id;
    }

    if (entityType === "inventory_ledger") {
      const simplified: any = {};
      if (formatted.Ingredient) simplified.Item = formatted.Ingredient;
      const unitStr = formatted.Unit ? ` ${formatted.Unit}` : "";
      if (formatted.quantity_change !== undefined) {
        simplified["Quantity Change"] = `${formatted.quantity_change > 0 ? "+" : ""}${formatted.quantity_change}${unitStr}`;
      }
      if (formatted.total_quantity_on_hand !== undefined) {
        simplified["Total On Hand"] = `${formatted.total_quantity_on_hand}${unitStr}`;
      }
      if (formatted.transaction_type) {
        simplified["Transaction Type"] = formatted.transaction_type;
      }
      return simplified;
    }

    return formatted;
  };

  // Helper to check if a row has expandable diff payload data
  const checkHasChanges = (row: any) => {
    const formattedOld = formatData(row.old_data, row.entity_type);
    const formattedNew = formatData(row.new_data, row.entity_type);

    const hasOld = formattedOld && typeof formattedOld === "object" && Object.keys(formattedOld).length > 0;
    const hasNew = formattedNew && typeof formattedNew === "object" && Object.keys(formattedNew).length > 0;

    return Boolean(hasOld || hasNew);
  };

  // Compute attribute diff entries
  const computeDiffEntries = (oldObj: any, newObj: any): DiffEntry[] => {
    const oldData = oldObj && typeof oldObj === "object" ? oldObj : {};
    const newData = newObj && typeof newObj === "object" ? newObj : {};

    const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));

    return allKeys.map((key) => {
      const formattedKey = key
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

      const hasOld = Object.prototype.hasOwnProperty.call(oldData, key) && oldData[key] !== null && oldData[key] !== undefined;
      const hasNew = Object.prototype.hasOwnProperty.call(newData, key) && newData[key] !== null && newData[key] !== undefined;

      const oldVal = hasOld ? oldData[key] : undefined;
      const newVal = hasNew ? newData[key] : undefined;

      if (!hasOld && hasNew) {
        return { key, formattedKey, status: "added", newVal };
      }
      if (hasOld && !hasNew) {
        return { key, formattedKey, status: "removed", oldVal };
      }
      if (String(oldVal) !== String(newVal)) {
        return { key, formattedKey, status: "modified", oldVal, newVal };
      }
      return { key, formattedKey, status: "unchanged", oldVal, newVal };
    });
  };

  // Helper to get entity icon
  const getEntityIcon = (type: string) => {
    switch (type) {
      case "inventory_ledger":
      case "stock_transfers":
        return <Package className="h-3.5 w-3.5 text-indigo-600" />;
      case "goods_receipts":
      case "purchase_orders":
        return <FileText className="h-3.5 w-3.5 text-blue-600" />;
      case "sales_orders":
        return <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />;
      case "menu_variants":
      case "ingredients":
        return <Utensils className="h-3.5 w-3.5 text-amber-600" />;
      default:
        return <Layers className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  // Action Status Badge (Title Case, clean single line)
  const renderActionBadge = (actionStr: string) => {
    const uppercaseAction = actionStr.toUpperCase();
    const formattedText = actionStr
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    // Green Lozenge for Success / Post / Done / Create
    if (uppercaseAction.includes("CREATE") || uppercaseAction.includes("POST") || uppercaseAction.includes("ADD") || uppercaseAction.includes("COMPLETED")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>{formattedText}</span>
        </span>
      );
    }

    // Blue/Amber Lozenge for In Progress / Update / Edit / Ready
    if (uppercaseAction.includes("UPDATE") || uppercaseAction.includes("EDIT") || uppercaseAction.includes("ADJUST") || uppercaseAction.includes("READY")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
          <span>{formattedText}</span>
        </span>
      );
    }

    // Red/Rose Lozenge for Delete / Cancel / Remove
    if (uppercaseAction.includes("DELETE") || uppercaseAction.includes("CANCEL") || uppercaseAction.includes("REMOVE")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>{formattedText}</span>
        </span>
      );
    }

    // Slate Lozenge for General / System Actions
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
        <span>{formattedText}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-md bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-2 duration-150">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Security & Compliance"
        title="System Audit Trail & Security Logs"
        description="Immutable system-wide event log, user action history, inventory movement audits, and data mutations"
        icon={ShieldCheck}
        iconBgColor="bg-slate-800 text-white"
        tabs={[
          { id: "audit-trail", label: "Audit Trail Ledger", icon: ShieldCheck, count: totalCount },
        ]}
      />

      {/* Main Container */}
      <div id="audit-trail" className="bg-white rounded-lg border border-slate-200/80 shadow-2xs overflow-hidden">
        
        {/* Navigation View Tabs */}
        <div className="flex items-center gap-1 bg-slate-50/80 px-3 pt-2 overflow-x-auto select-none border-b border-slate-200/80">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded-t-md px-3.5 py-2 text-xs font-medium transition-all ${
              activeTab === "all"
                ? "bg-white text-slate-900 border-t-2 border-t-indigo-600 border-x border-b-white font-semibold -mb-px z-10 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
            <span>All activities</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-mono font-semibold text-slate-500">
              {tabCounts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-1.5 rounded-t-md px-3.5 py-2 text-xs font-medium transition-all ${
              activeTab === "inventory"
                ? "bg-white text-slate-900 border-t-2 border-t-indigo-600 border-x border-b-white font-semibold -mb-px z-10 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
            }`}
          >
            <Package className="h-3.5 w-3.5 text-indigo-500" />
            <span>Inventory log</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-mono font-semibold text-slate-500">
              {tabCounts.inventory}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-1.5 rounded-t-md px-3.5 py-2 text-xs font-medium transition-all ${
              activeTab === "orders"
                ? "bg-white text-slate-900 border-t-2 border-t-indigo-600 border-x border-b-white font-semibold -mb-px z-10 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5 text-emerald-500" />
            <span>Orders & Purchasing</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-mono font-semibold text-slate-500">
              {tabCounts.orders}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-1.5 rounded-t-md px-3.5 py-2 text-xs font-medium transition-all ${
              activeTab === "catalog"
                ? "bg-white text-slate-900 border-t-2 border-t-indigo-600 border-x border-b-white font-semibold -mb-px z-10 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
            }`}
          >
            <Utensils className="h-3.5 w-3.5 text-amber-500" />
            <span>Catalog & Master Data</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-mono font-semibold text-slate-500">
              {tabCounts.catalog}
            </span>
          </button>
        </div>

        {/* Filter Control Toolbar */}
        <div className="flex flex-col gap-2.5 border-b border-slate-200/80 bg-white px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            
            {/* Actor Filter Dropdown */}
            <div className="flex items-center rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-1 hover:bg-slate-100 transition-colors">
              <User className="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
              <select
                value={actorIdFilter}
                onChange={(e) => {
                  setActorIdFilter(e.target.value);
                  updateFilters({ actor_id: e.target.value });
                }}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer text-xs"
              >
                <option value="all">Actor: All Users</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter Dropdown */}
            <div className="flex items-center rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-1 hover:bg-slate-100 transition-colors">
              <Layers className="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
              <select
                value={entityTypeFilter}
                onChange={(e) => {
                  setEntityTypeFilter(e.target.value);
                  updateFilters({ entity_type: e.target.value });
                }}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer text-xs"
              >
                <option value="all">Entity: All Types</option>
                {availableEntityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter Dropdown */}
            <div className="flex items-center rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-1 hover:bg-slate-100 transition-colors">
              <Zap className="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  updateFilters({ action: e.target.value });
                }}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer text-xs"
              >
                <option value="all">Action: All Actions</option>
                {availableActions.map((act) => (
                  <option key={act} value={act}>
                    {act.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-1 hover:bg-slate-100 transition-colors">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
              <select
                value={activeSort}
                onChange={handleSortChange}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer text-xs"
              >
                <option value="date-desc">Sort: Date (Newest)</option>
                <option value="date-asc">Sort: Date (Oldest)</option>
                <option value="entity_type-asc">Sort: Entity (A-Z)</option>
                <option value="action-asc">Sort: Action (A-Z)</option>
              </select>
            </div>

            {/* Reset filters button */}
            {(actorIdFilter !== "all" || entityTypeFilter !== "all" || actionFilter !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setActorIdFilter("all");
                  setEntityTypeFilter("all");
                  setActionFilter("all");
                  setSearchQuery("");
                  router.push(pathname);
                }}
                className="flex items-center gap-1 px-2.5 py-1 font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer rounded hover:bg-indigo-50"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by actor, entity or reference..."
              className="w-full rounded-md border border-slate-200 bg-slate-50/50 pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/60 text-xs font-semibold text-slate-700">
                <th className="py-2.5 px-3 border-r border-slate-200/80 w-8 text-center"></th>
                <th className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">Timestamp</th>
                <th className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">Action Status</th>
                <th className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">Reference Key / ID</th>
                <th className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">Actor</th>
                <th className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">Entity Category</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap w-16">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-normal">
                    No activity logs match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const hasChanges = checkHasChanges(row);
                  const isExpanded = hasChanges && !!expandedRows[row.id];
                  const actorName = row.profiles?.full_name || "System Automations";
                  const actorEmail = row.profiles?.email || "";
                  const initials = actorName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  const rawEntityId = row.entity_id || "";
                  const formattedEntityId = row.formatted_entity_id || rawEntityId || "-";
                  const dateObj = new Date(row.occurred_at);

                  const displayEntityId =
                    formattedEntityId.length > 32
                      ? `${formattedEntityId.substring(0, 10)}...${formattedEntityId.substring(formattedEntityId.length - 6)}`
                      : formattedEntityId;

                  const formattedOld = formatData(row.old_data, row.entity_type);
                  const formattedNew = formatData(row.new_data, row.entity_type);
                  const diffEntries = computeDiffEntries(formattedOld, formattedNew);

                  return (
                    <React.Fragment key={`audit-row-${row.id}`}>
                      <tr
                        onClick={() => toggleRow(row.id, hasChanges)}
                        className={`h-11 border-b border-slate-200/80 transition-colors group ${
                          hasChanges ? "cursor-pointer hover:bg-slate-50/80" : "bg-white cursor-default opacity-90"
                        } ${isExpanded ? "bg-slate-50 font-medium" : ""}`}
                      >
                        {/* Expansion Icon / Disabled Indicator */}
                        <td className="py-2 px-3 border-r border-slate-200/80 text-center text-slate-400">
                          {hasChanges ? (
                            isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 inline-block text-indigo-600" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 inline-block group-hover:text-slate-700" />
                            )
                          ) : (
                            <span className="text-slate-300 select-none text-[11px]">—</span>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="py-2 px-4 border-r border-slate-200/80 whitespace-nowrap">
                          <div className="flex items-baseline gap-1.5 text-xs text-slate-800 font-sans">
                            <span className="font-semibold">{format(dateObj, "MMM d, yyyy")}</span>
                            <span className="text-slate-500 text-[11px]">
                              {format(dateObj, "h:mm:ss a")}
                            </span>
                            <span className="text-slate-400 text-[11px] font-normal">
                              ({formatDistanceToNow(dateObj, { addSuffix: false })} ago)
                            </span>
                          </div>
                        </td>

                        {/* Action Status */}
                        <td className="py-2 px-4 border-r border-slate-200/80 whitespace-nowrap">
                          {renderActionBadge(row.action)}
                        </td>

                        {/* Reference Key / ID */}
                        <td className="py-2 px-4 border-r border-slate-200/80 whitespace-nowrap">
                          <div className="group/ref flex items-center justify-between gap-1.5">
                            <span
                              title={formattedEntityId}
                              className="font-sans text-xs font-medium text-slate-800 whitespace-nowrap"
                            >
                              {displayEntityId}
                            </span>
                            {rawEntityId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(rawEntityId, "Entity ID");
                                }}
                                className="opacity-0 group-hover/ref:opacity-100 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
                                title="Copy Entity ID"
                              >
                                {copiedItem === rawEntityId ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-2 px-4 border-r border-slate-200/80 whitespace-nowrap">
                          <div className="group/actor flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700 border border-indigo-200/60">
                                {initials || "SY"}
                              </div>
                              <span className="font-medium text-slate-800 text-xs whitespace-nowrap">
                                {actorName}
                              </span>
                            </div>
                            {actorEmail && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(actorEmail, actorEmail);
                                }}
                                className="opacity-0 group-hover/actor:opacity-100 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
                                title="Copy email"
                              >
                                {copiedItem === actorEmail ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Entity Category */}
                        <td className="py-2 px-4 border-r border-slate-200/80 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200/90 whitespace-nowrap shadow-2xs">
                            {getEntityIcon(row.entity_type)}
                            <span>
                              {row.entity_type
                                .split("_")
                                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                .join(" ")}
                            </span>
                          </span>
                        </td>

                        {/* Inspect Column */}
                        <td className="py-2 px-4 text-right whitespace-nowrap">
                          {hasChanges ? (
                            <span className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline">
                              {isExpanded ? "Collapse" : "Inspect"}
                            </span>
                          ) : (
                            <span className="text-xs font-normal text-slate-300 select-none">
                              No details
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Business ERP Activity Breakdown Drawer (Clean Font-Sans, Airbnb Cereal Aesthetic) */}
                      {isExpanded && hasChanges && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={7} className="px-5 py-4 font-sans">
                            <div className="space-y-3">
                              {/* Header bar of drawer */}
                              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                                  <ClipboardList className="h-4 w-4 text-indigo-600" />
                                  <span>Activity Change Breakdown</span>
                                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                    {row.entity_type
                                      .split("_")
                                      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                      .join(" ")}
                                  </span>
                                </div>
                              </div>

                              {/* ERP Inventory & Master Data Attribute Breakdown Table */}
                              <div className="rounded-lg border border-slate-200/90 bg-white overflow-hidden shadow-2xs font-sans text-xs">
                                <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 py-2 flex items-center justify-between text-xs text-slate-600 font-medium">
                                  <span>Record Field</span>
                                  <span>Value &amp; Status Transition</span>
                                </div>

                                <div className="divide-y divide-slate-200/80">
                                  {diffEntries.map((item) => (
                                    <div key={item.key} className="flex flex-col sm:flex-row text-xs font-sans">
                                      {/* Field Name */}
                                      <div className="sm:w-52 shrink-0 bg-slate-50/40 px-4 py-3 border-r border-slate-200/80 font-medium text-slate-800 flex items-center">
                                        {item.formattedKey}
                                      </div>

                                      {/* Transition / State representation */}
                                      <div className="flex-1 bg-white px-4 py-2.5 flex items-center gap-2 flex-wrap text-xs">
                                        {item.status === "modified" && (
                                          <div className="flex items-center gap-2 flex-wrap w-full">
                                            {/* Previous Value */}
                                            <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs text-slate-700 font-normal">
                                              <span className="text-[11px] text-slate-400 font-medium">Previous:</span>
                                              <span>{String(item.oldVal)}</span>
                                            </div>

                                            {/* Transition Arrow */}
                                            <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />

                                            {/* Updated Value */}
                                            <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs text-emerald-800 font-medium">
                                              <span className="text-[11px] text-emerald-600/80 font-medium">Updated:</span>
                                              <span>{String(item.newVal)}</span>
                                            </div>
                                          </div>
                                        )}

                                        {item.status === "added" && (
                                          <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-800 font-medium">
                                            <span className="text-[11px] text-slate-500 font-normal">Added:</span>
                                            <span>{String(item.newVal)}</span>
                                          </div>
                                        )}

                                        {item.status === "removed" && (
                                          <div className="inline-flex items-center gap-1.5 rounded-md border border-rose-200/80 bg-rose-50/80 px-3 py-1 text-xs text-rose-800 font-medium">
                                            <span className="text-[11px] text-rose-500 font-normal">Removed:</span>
                                            <span className="line-through">{String(item.oldVal)}</span>
                                          </div>
                                        )}

                                        {item.status === "unchanged" && (
                                          <div className="text-slate-700 font-normal px-1 py-0.5">
                                            {String(item.newVal ?? item.oldVal)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 flex items-center justify-between text-xs text-slate-600 font-sans">
            <span>
              Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * 20 + 1}</span> to{" "}
              <span className="font-semibold text-slate-900">{Math.min(currentPage * 20, totalCount)}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalCount}</span> entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-mono text-slate-500 px-1">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
