"use client";

import { useState } from "react";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { UnitDialog } from "./unit-dialog";
import { DeleteUnitDialog } from "./delete-unit-dialog";
import { Scale, Hash, Tag, ArrowRightLeft, Activity, Plus } from "lucide-react";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface UnitsTableProps {
  units: Unit[];
}

export function UnitsTable({ units }: UnitsTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  const [activeSort, setActiveSort] = useState("name-asc");

  const sortOptions = [
    { label: "Name (A-Z)", value: "name-asc" },
    { label: "Name (Z-A)", value: "name-desc" },
    { label: "Symbol (A-Z)", value: "symbol-asc" },
    { label: "Symbol (Z-A)", value: "symbol-desc" },
  ];

  const sortedUnits = [...units].sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "name") return a.name.localeCompare(b.name) * mod;
    if (by === "symbol") return (a.symbol || "").localeCompare(b.symbol || "") * mod;
    return 0;
  });

  const getBaseUnitInfo = (unit: Unit) => {
    if (unit.is_base_unit) return "Base Unit";
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

      <div id="units-table" className="space-y-4">

      <TableToolbar 
        sortOptions={sortOptions}
        activeSort={activeSort}
        onSortChange={setActiveSort}
      />

      <div className="rounded-md border border-neutral-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/60 text-xs font-semibold text-neutral-700">
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-neutral-400" />Name</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-neutral-400" />Symbol</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-neutral-400" />Category</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5 text-neutral-400" />Conversion</div>
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
            {units.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No units found. Add some base units to get started.
                </td>
              </tr>
            ) : (
              sortedUnits.map((unit) => (
                <tr key={unit.id} className="h-11 border-b border-neutral-200 transition-colors group hover:bg-neutral-50/80">
                  <td className="py-2.5 px-4 border-r border-neutral-200 font-medium text-neutral-900">
                    {unit.name}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    {unit.symbol}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-800">
                      {unit.measurement_category}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    {getBaseUnitInfo(unit)}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        unit.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-red-50 text-red-700 border-red-200/60"
                      }`}
                    >
                      {unit.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => setEditUnit(unit)}
                      className="mr-4 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteUnit(unit)}
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
    </div>
  );
}

