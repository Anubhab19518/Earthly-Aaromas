"use client";

import { useState } from "react";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { UnitDialog } from "./unit-dialog";
import { DeleteUnitDialog } from "./delete-unit-dialog";
import { Scale, Hash, Tag, ArrowRightLeft, Activity } from "lucide-react";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";

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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Units of Measurement</h2>
          <p className="text-sm text-zinc-500">Manage global units and their conversions.</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Add Unit
        </button>
      </div>

      <TableToolbar 
        sortOptions={sortOptions}
        activeSort={activeSort}
        onSortChange={setActiveSort}
      />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="divide-x divide-zinc-200">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" />Name</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />Symbol</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Category</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5" />Conversion</div>
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
            {units.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No units found. Add some base units to get started.
                </td>
              </tr>
            ) : (
              sortedUnits.map((unit) => (
                <tr key={unit.id} className="hover:bg-zinc-50 divide-x divide-zinc-200">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">
                    {unit.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    {unit.symbol}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
                      {unit.measurement_category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    {getBaseUnitInfo(unit)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        unit.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {unit.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => setEditUnit(unit)}
                      className="mr-4 text-zinc-600 hover:text-zinc-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteUnit(unit)}
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

