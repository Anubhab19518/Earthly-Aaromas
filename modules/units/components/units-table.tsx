"use client";

import { useState } from "react";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { UnitDialog } from "./unit-dialog";
import { DeleteUnitDialog } from "./delete-unit-dialog";
import { 
  Scale, 
  Hash, 
  Tag, 
  ArrowRightLeft, 
  Activity, 
  Plus,
  Search,
  Layers,
  X,
  Edit2,
  Trash2
} from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface UnitsTableProps {
  units: Unit[];
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

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] font-semibold tracking-tight text-slate-700 whitespace-nowrap">
      {type}
    </span>
  );
}

export function UnitsTable({ units }: UnitsTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeSort, setActiveSort] = useState("name-asc");

  // Filter and Sort Logic
  const filtered = units.filter((unit) => {
    const matchesSearch = unit.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (unit.symbol && unit.symbol.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesStatus = true;
    if (statusFilter === "BASE") matchesStatus = unit.is_base_unit === true;
    if (statusFilter === "DERIVED") matchesStatus = unit.is_base_unit === false;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "name") return a.name.localeCompare(b.name) * mod;
    if (by === "symbol") return (a.symbol || "").localeCompare(b.symbol || "") * mod;
    return 0;
  });

  // Calculate counts for tabs
  const getCount = (filterType: string) => {
    if (filterType === "ALL") return units.length;
    if (filterType === "BASE") return units.filter(u => u.is_base_unit).length;
    if (filterType === "DERIVED") return units.filter(u => !u.is_base_unit).length;
    return 0;
  };

  const tabs = [
    { id: "ALL", label: "All Units" },
    { id: "BASE", label: "Base Units" },
    { id: "DERIVED", label: "Derived Units" },
  ];

  const getBaseUnitInfo = (unit: Unit) => {
    if (unit.is_base_unit) return <TypeBadge type="Base Unit" />;
    if (!unit.base_unit_id) return "-";
    const baseUnit = units.find(u => u.id === unit.base_unit_id);
    if (!baseUnit) return "-";
    return `1 = ${unit.conversion_factor} ${baseUnit.symbol}`;
  };

  return (
    <div className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Global Master Data"
        title="Units of Measurement (UOM)"
        description="Standardize base measurement units, volume/weight symbols, and global conversion formulas"
        icon={Scale}
        iconBgColor="bg-[#254f8a] text-white"
        tabs={[
          { id: "units-table", label: "Units Directory", icon: Scale, count: units.length },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-[#254f8a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e4070] transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Unit</span>
          </button>
        }
      />

      <div id="units-table" className="bg-white shadow-xs overflow-hidden rounded-xl border border-slate-200">
        
        {/* Top View Tabs (Airtable / Linear Style) */}
        <div className="flex items-center gap-1 bg-slate-50/70 pl-0 pr-4 pt-2.5 overflow-x-auto select-none border-b border-slate-200/80">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? "relative bg-white text-slate-900 border border-slate-200/90 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                  : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
              }`}
            >
              <span>{tab.label}</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
                {getCount(tab.id)}
              </span>
            </button>
          ))}
          
          <div className="h-4 w-px bg-slate-200/80 mx-1" />
          
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 rounded-t-lg px-3 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 transition-all duration-300 ease-in-out cursor-pointer whitespace-nowrap"
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
                <option value="symbol-asc">Symbol (A-Z)</option>
                <option value="symbol-desc">Symbol (Z-A)</option>
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
              placeholder="Search Name or Symbol..."
              className="w-full rounded-md border border-slate-200/80 bg-slate-50/50 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all"
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
              <Scale className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-[14px] font-medium text-slate-900">No Units</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                You don't have any units matching these filters. Try adjusting your search or add a new one.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/50 text-xs font-semibold text-slate-700">
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]"><div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-slate-400" />Name</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" />Symbol</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]"><div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-slate-400" />Category</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]"><div className="flex items-center gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />Conversion</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-slate-400" />Status</div></th>
                  <th className="py-2.5 px-4 text-right w-[10%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs font-normal text-slate-800">
                {filtered.map((unit) => (
                  <tr key={unit.id} className="border-b border-slate-200/80 hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                      {unit.name}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 text-slate-600">
                      {unit.symbol}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80">
                      <span className="inline-flex items-center rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium bg-white text-slate-700">
                        {unit.measurement_category}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 text-slate-600">
                      {getBaseUnitInfo(unit)}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80">
                      <StatusBadge status={unit.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditUnit(unit)}
                          className="rounded p-1.5 text-slate-400 hover:bg-[#254f8a]/10 hover:text-[#254f8a] transition-colors cursor-pointer"
                          title="Edit Unit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteUnit(unit)}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Unit"
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

      <UnitDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        units={units}
      />

      <UnitDialog
        open={!!editUnit}
        onOpenChange={(open) => !open && setEditUnit(null)}
        unit={editUnit || undefined}
        units={units}
      />

      <DeleteUnitDialog
        open={!!deleteUnit}
        onOpenChange={(open) => !open && setDeleteUnit(null)}
        unit={deleteUnit}
      />
    </div>
  );
}

