"use client";

import { useState } from "react";
import { Location, LocationType } from "@/modules/locations/schemas/location.schema";
import { LocationDialog } from "./location-dialog";
import { DeleteLocationDialog } from "./delete-location-dialog";

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Locations</h2>
          <p className="text-sm text-zinc-500">Manage your warehouses, shops, and other facilities.</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="rounded-md bg-[#587333] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a4f20]"
        >
          Add Location
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Code
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Parent
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
            {locations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No locations found. Get started by adding a warehouse.
                </td>
              </tr>
            ) : (
              locations.map((location) => (
                <tr key={location.id} className="hover:bg-zinc-50">
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
  );
}

