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

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="divide-x divide-zinc-200">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />Code</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Name</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Type</div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <div className="flex items-center gap-1.5"><Network className="w-3.5 h-3.5" />Parent</div>
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
            {locations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No locations found. Get started by adding a warehouse.
                </td>
              </tr>
            ) : (
              sortedLocations.map((location) => (
                <tr key={location.id} className="hover:bg-zinc-50 divide-x divide-zinc-200">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900">{location.code}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">{location.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
                      {location.location_types?.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    {location.parent ? `${location.parent.name} (${location.parent.code})` : "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        location.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {location.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => setEditLocation(location)}
                      className="mr-4 text-zinc-600 hover:text-zinc-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteLocation(location)}
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

