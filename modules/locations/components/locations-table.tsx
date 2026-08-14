"use client";

import { useState } from "react";
import { 
  Hash, 
  MapPin, 
  Tag, 
  Network, 
  Activity, 
  Building2, 
  Plus,
  Search,
  Layers,
  X,
  Edit2,
  Trash2
} from "lucide-react";
import { Location, LocationType } from "@/modules/locations/schemas/location.schema";
import { LocationDialog } from "./location-dialog";
import { DeleteLocationDialog } from "./delete-location-dialog";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

type LocationWithRelations = Location & {
  location_types: { code: string; name: string };
  parent: { code: string; name: string } | null;
};

interface LocationsTableProps {
  locations: LocationWithRelations[];
  locationTypes: LocationType[];
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

export function LocationsTable({ locations, locationTypes }: LocationsTableProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<LocationWithRelations | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<LocationWithRelations | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeSort, setActiveSort] = useState("name-asc");

  // Filter and Sort Logic
  const filtered = locations.filter((loc) => {
    const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          loc.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || loc.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "name") return a.name.localeCompare(b.name) * mod;
    if (by === "code") return a.code.localeCompare(b.code) * mod;
    if (by === "status") return a.status.localeCompare(b.status) * mod;
    return 0;
  });

  // Calculate counts for tabs
  const getCount = (status: string) => status === "ALL" 
    ? locations.length 
    : locations.filter(l => l.status === status).length;

  const tabs = [
    { id: "ALL", label: "All Locations" },
    { id: "ACTIVE", label: "Active" },
    { id: "INACTIVE", label: "Inactive" },
  ];

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

      <div id="locations-table" className="bg-white shadow-xs overflow-hidden rounded-xl border border-slate-200">
        
        {/* Top View Tabs (Airtable / Linear Style) */}
        <div className="flex items-center gap-1 bg-slate-50/70 px-4 pt-2.5 overflow-x-auto select-none border-b border-slate-200/80">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-white text-slate-900 border border-b-white border-slate-200/90 shadow-2xs font-semibold -mb-px z-10"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                statusFilter === tab.id ? "bg-slate-100 text-slate-500" : "text-slate-400"
              }`}>
                {getCount(tab.id)}
              </span>
            </button>
          ))}
          
          <div className="h-4 w-px bg-slate-200/80 mx-1" />
          
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 rounded-t-lg px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
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
                <option value="code-asc">Code (A-Z)</option>
                <option value="code-desc">Code (Z-A)</option>
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
              placeholder="Search by Name or Code..."
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
              <Building2 className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-[14px] font-medium text-slate-900">No Locations</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                You don't have any locations matching these filters. Try adjusting your search or add a new one.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/50 text-xs font-semibold text-slate-700">
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" />Code</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[25%]"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />Name</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-slate-400" />Type</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]"><div className="flex items-center gap-1.5"><Network className="w-3.5 h-3.5 text-slate-400" />Parent</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-slate-400" />Status</div></th>
                  <th className="py-2.5 px-4 text-right w-[10%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs font-normal text-slate-800">
                {filtered.map((location) => (
                  <tr key={location.id} className="border-b border-slate-200/80 hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                      {location.code}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 text-slate-700">
                      {location.name}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80">
                      <TypeBadge type={location.location_types?.name} />
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 text-slate-600">
                      {location.parent ? `${location.parent.name} (${location.parent.code})` : "-"}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80">
                      <StatusBadge status={location.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditLocation(location)}
                          className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="Edit Location"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteLocation(location)}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Location"
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

