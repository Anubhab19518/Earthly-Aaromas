"use client";

import { useState } from "react";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { UnitDialog } from "./unit-dialog";
import { DeleteUnitDialog } from "./delete-unit-dialog";

interface UnitsTableProps {
  units: Unit[];
}

export function UnitsTable({ units }: UnitsTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);

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
          className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a4f20]"
        >
          Add Unit
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Symbol
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Conversion
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Status
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
              units.map((unit) => (
                <tr key={unit.id} className="hover:bg-zinc-50">
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

