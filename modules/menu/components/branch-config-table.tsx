"use client";

import { useState, useTransition } from "react";
import { saveBranchMenuConfig } from "../services/menu.actions";
import { Loader2 } from "lucide-react";

interface BranchConfig {
  id: string;
  location_id: string;
  variant_id: string;
  is_available: boolean;
  price_override: number | null;
  locations?: {
    name: string;
  };
}

interface Location {
  id: string;
  name: string;
}

interface Props {
  variantId: string;
  defaultPrice: number;
  configs: BranchConfig[];
  allLocations: Location[];
}

export function BranchConfigTable({ variantId, defaultPrice, configs, allLocations }: Props) {
  const [isPending, startTransition] = useTransition();
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  
  const handleSave = (locationId: string, isAvailable: boolean, priceOverride: string) => {
    startTransition(async () => {
      setActiveLocation(locationId);
      const formData = new FormData();
      formData.append("location_id", locationId);
      formData.append("variant_id", variantId);
      formData.append("is_available", String(isAvailable));
      formData.append("price_override", priceOverride);
      
      await saveBranchMenuConfig(null, formData);
      setActiveLocation(null);
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm mt-6">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Branch Availability & Pricing</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Override prices or disable this variant at specific branches.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-6 py-3 font-medium">Branch</th>
              <th className="px-6 py-3 font-medium">Available</th>
              <th className="px-6 py-3 font-medium">Price Override (₹)</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {allLocations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                  No branches found.
                </td>
              </tr>
            ) : (
              allLocations.map((location) => {
                const existingConfig = configs.find((c) => c.location_id === location.id);
                const isAvailable = existingConfig ? existingConfig.is_available : true;
                const priceOverride = existingConfig?.price_override ?? "";
                const isSaving = isPending && activeLocation === location.id;

                return (
                  <ConfigRow
                    key={location.id}
                    locationName={location.name}
                    isAvailable={isAvailable}
                    priceOverride={priceOverride}
                    defaultPrice={defaultPrice}
                    isSaving={isSaving}
                    onSave={(avail, override) => handleSave(location.id, avail, override)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfigRow({
  locationName,
  isAvailable: initialAvailable,
  priceOverride: initialOverride,
  defaultPrice,
  isSaving,
  onSave
}: {
  locationName: string;
  isAvailable: boolean;
  priceOverride: number | string;
  defaultPrice: number;
  isSaving: boolean;
  onSave: (isAvailable: boolean, priceOverride: string) => void;
}) {
  const [isAvailable, setIsAvailable] = useState(initialAvailable);
  const [priceOverride, setPriceOverride] = useState<string>(initialOverride ? String(initialOverride) : "");

  const hasChanged = isAvailable !== initialAvailable || 
    (priceOverride === "" && initialOverride !== "") || 
    (priceOverride !== "" && Number(priceOverride) !== Number(initialOverride));

  return (
    <tr className="hover:bg-zinc-50/50">
      <td className="px-6 py-4 font-medium text-zinc-900">{locationName}</td>
      <td className="px-6 py-4">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
          />
          <div className="h-5 w-9 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#587333] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#4a632a] peer-focus:ring-offset-2"></div>
        </label>
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="0.01"
          placeholder={`Default (₹${defaultPrice})`}
          value={priceOverride}
          onChange={(e) => setPriceOverride(e.target.value)}
          className="h-8 w-32 rounded-md border border-zinc-300 px-2 text-sm outline-none focus:border-[#4a632a] focus:ring-1 focus:ring-[#4a632a]"
          disabled={!isAvailable}
        />
      </td>
      <td className="px-6 py-4 text-right">
        {hasChanged && (
          <button
            onClick={() => onSave(isAvailable, priceOverride)}
            disabled={isSaving}
            className="inline-flex h-8 items-center justify-center rounded-md bg-[#587333] px-3 text-xs font-medium text-white hover:bg-[#3a4f20] disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </button>
        )}
      </td>
    </tr>
  );
}

