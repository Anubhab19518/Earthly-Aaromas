"use client";

import { useState, useTransition } from "react";
import { saveBranchMenuConfig } from "../services/menu.actions";
import { Loader2, Store, Check, AlertCircle } from "lucide-react";
import { Input } from "@/shared/components/ui/input";

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
    <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden text-xs font-sans">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-slate-900">Branch Pricing & Availability</h2>
              <span className="flex h-4.5 px-1.5 items-center justify-center rounded text-[10px] font-mono font-medium bg-slate-200 text-slate-700">
                {allLocations.length} branches
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Override prices or disable this variant at specific airport, kiosk, or city outlets
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-500 select-none">
              <th className="py-2.5 px-4 border-r border-slate-200/80 w-[40%]">Branch Location</th>
              <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%] text-center">Available</th>
              <th className="py-2.5 px-4 border-r border-slate-200/80 w-[25%] font-mono">Price Override (₹)</th>
              <th className="py-2.5 px-4 text-right w-[15%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs text-slate-800">
            {allLocations.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-slate-400">
                  <Store className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-600">No branch locations configured</p>
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
  onSave,
}: {
  locationName: string;
  isAvailable: boolean;
  priceOverride: number | string;
  defaultPrice: number;
  isSaving: boolean;
  onSave: (isAvailable: boolean, priceOverride: string) => void;
}) {
  const [isAvailable, setIsAvailable] = useState(initialAvailable);
  const [priceOverride, setPriceOverride] = useState<string>(
    initialOverride ? String(initialOverride) : ""
  );

  const hasChanged =
    isAvailable !== initialAvailable ||
    (priceOverride === "" && initialOverride !== "") ||
    (priceOverride !== "" && Number(priceOverride) !== Number(initialOverride));

  return (
    <tr className="hover:bg-slate-50/60 transition-colors">
      <td className="py-2.5 px-4 border-r border-slate-200/80 font-medium text-slate-900">
        <div className="flex items-center gap-2">
          <Store className="h-3.5 w-3.5 text-slate-400" />
          <span>{locationName}</span>
        </div>
      </td>
      <td className="py-2.5 px-4 border-r border-slate-200/80 text-center">
        <button
          type="button"
          onClick={() => setIsAvailable(!isAvailable)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
            isAvailable
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
              : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}
        >
          {isAvailable ? "Available" : "Disabled"}
        </button>
      </td>
      <td className="py-2.5 px-4 border-r border-slate-200/80">
        <Input
          type="number"
          step="any"
          min="0"
          placeholder={`Default (₹${defaultPrice.toFixed(0)})`}
          value={priceOverride}
          onChange={(e) => setPriceOverride(e.target.value)}
          className="h-7 w-36 text-xs font-mono bg-white"
          disabled={!isAvailable}
        />
      </td>
      <td className="py-2.5 px-4 text-right">
        {hasChanged && (
          <button
            type="button"
            onClick={() => onSave(isAvailable, priceOverride)}
            disabled={isSaving}
            className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            <span>Save</span>
          </button>
        )}
      </td>
    </tr>
  );
}
