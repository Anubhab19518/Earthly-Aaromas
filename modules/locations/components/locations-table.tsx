"use client";

import { useState } from "react";
import { Hash, MapPin, Tag, Network, Activity, Building2, Plus } from "lucide-react";
import { Location, LocationType } from "@/modules/locations/schemas/location.schema";
import { LocationDialog } from "./location-dialog";
import { DeleteLocationDialog } from "./delete-location-dialog";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

type LocationWithRelations = Location & {
  location_types: { code: string; name: string };
  parent: { code: string; name: string } | null;
};

interface LocationsTableProps {
  locations: LocationWithRelations[];
  locationTypes: LocationType[];
}

export function LocationsTable({ locations, locationTypes }: LocationsTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<LocationWithRelations | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<LocationWithRelations | null>(null);
  const [activeSort, setActiveSort] = useState("name-asc");

  const sortOptions = [
    { label: "Name (A-Z)", value: "name-asc" },
    { label: "Name (Z-A)", value: "name-desc" },
    { label: "Code (A-Z)", value: "code-asc" },
    { label: "Code (Z-A)", value: "code-desc" },
    { label: "Status (A-Z)", value: "status-asc" },
  ];

  const sortedLocations = [...locations].sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "name") return a.name.localeCompare(b.name) * mod;
    if (by === "code") return a.code.localeCompare(b.code) * mod;
    if (by === "status") return a.status.localeCompare(b.status) * mod;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Master Data & Workspaces"
        title="Workspaces & Locations Directory"
        description="Manage central warehouses, retail shops, counters, and organizational branch hierarchies"
        icon={Building2}
        iconBgColor="bg-indigo-600 text-white"
        tabs={[
          { id: "locations-table", label: "Branches & Warehouses", icon: MapPin, count: locations.length },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Location</span>
          </button>
        }
      />

      <div id="locations-table" className="space-y-4">

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
                  <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-neutral-400" />Code</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-neutral-400" />Name</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-neutral-400" />Type</div>
                </th>
                <th className="py-2.5 px-4 border-r border-neutral-200">
                  <div className="flex items-center gap-1.5"><Network className="w-3.5 h-3.5 text-neutral-400" />Parent</div>
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
            {locations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No locations found. Get started by adding a warehouse.
                </td>
              </tr>
            ) : (
              sortedLocations.map((location) => (
                <tr key={location.id} className="h-11 border-b border-neutral-200 transition-colors group hover:bg-neutral-50/80">
                  <td className="py-2.5 px-4 border-r border-neutral-200 font-medium text-neutral-900">{location.code}</td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">{location.name}</td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-800">
                      {location.location_types?.name}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    {location.parent ? `${location.parent.name} (${location.parent.code})` : "-"}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        location.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-red-50 text-red-700 border-red-200/60"
                      }`}
                    >
                      {location.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => setEditLocation(location)}
                      className="mr-4 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteLocation(location)}
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

      <LocationDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        locationTypes={locationTypes}
        locations={locations}
      />

      <LocationDialog
        open={!!editLocation}
        onOpenChange={(open) => !open && setEditLocation(null)}
        location={editLocation || undefined}
        locationTypes={locationTypes}
        locations={locations}
      />

      <DeleteLocationDialog
        open={!!deleteLocation}
        onOpenChange={(open) => !open && setDeleteLocation(null)}
        location={deleteLocation}
      />
      </div>
    </div>
  );
}

