"use client";

import { useState, useEffect, useTransition, useRef, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { InventoryAlertPolicy } from "@/modules/inventory/schemas/alert-policy.schema";
import {
  createAlertPolicy,
  updateAlertPolicy,
  deleteAlertPolicy,
} from "@/modules/inventory/services/alert-policy.actions";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import {
  AlertTriangle,
  Plus,
  X,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Building2,
  ShieldAlert,
  ChevronLeft,
  CornerDownLeft,
  Info,
} from "lucide-react";

interface AlertPoliciesPanelProps {
  ingredient: Ingredient;
  baseUnit: Unit;
  locations: Location[];
  policies: InventoryAlertPolicy[];
  open: boolean;
  onClose: () => void;
}

export function AlertPoliciesPanel({
  ingredient,
  baseUnit,
  locations,
  policies,
  open,
  onClose,
}: AlertPoliciesPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Progressive Step-by-Step Inline Creation State
  const [isAdding, setIsAdding] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2 | 3 | 4>(1);
  const [locationId, setLocationId] = useState("");
  const [warningLevel, setWarningLevel] = useState<string>("50");
  const [criticalLevel, setCriticalLevel] = useState<string>("20");
  const [outOfStockLevel, setOutOfStockLevel] = useState<string>("0");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Input refs for automatic focus
  const warningInputRef = useRef<HTMLInputElement>(null);
  const criticalInputRef = useRef<HTMLInputElement>(null);
  const oosInputRef = useRef<HTMLInputElement>(null);

  // Inline Editing Row State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWarningLevel, setEditWarningLevel] = useState<string>("");
  const [editCriticalLevel, setEditCriticalLevel] = useState<string>("");
  const [editOutOfStockLevel, setEditOutOfStockLevel] = useState<string>("");

  // Inline Deleting Row State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-focus on step changes
  useEffect(() => {
    if (isAdding) {
      if (addStep === 2) {
        setTimeout(() => warningInputRef.current?.focus(), 50);
      } else if (addStep === 3) {
        setTimeout(() => criticalInputRef.current?.focus(), 50);
      } else if (addStep === 4) {
        setTimeout(() => oosInputRef.current?.focus(), 50);
      }
    }
  }, [isAdding, addStep]);

  if (!open || !mounted) return null;

  const ingredientPolicies = policies.filter((p) => p.ingredient_id === ingredient.id);

  // Locations that don't have a policy configured yet
  const availableLocations = locations.filter(
    (loc) => !ingredientPolicies.some((p) => p.location_id === loc.id)
  );

  const selectedLocation = locations.find((l) => l.id === locationId);

  const resetAddForm = () => {
    setIsAdding(false);
    setAddStep(1);
    setLocationId("");
    setWarningLevel("50");
    setCriticalLevel("20");
    setOutOfStockLevel("0");
    setErrorMsg(null);
  };

  const startEdit = (policy: InventoryAlertPolicy) => {
    setEditingId(policy.id);
    setEditWarningLevel(String(policy.warning_level));
    setEditCriticalLevel(String(policy.critical_level));
    setEditOutOfStockLevel(String(policy.out_of_stock_level));
    setErrorMsg(null);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrorMsg(null);
  };

  // Step advancement validation
  const handleStep1Next = () => {
    if (!locationId) {
      setErrorMsg("Please select a facility location.");
      return;
    }
    setErrorMsg(null);
    setAddStep(2);
  };

  const handleStep2Next = () => {
    const warn = Number(warningLevel);
    if (isNaN(warn) || warn < 0) {
      setErrorMsg("Please enter a valid warning threshold (>= 0).");
      return;
    }
    setErrorMsg(null);
    setAddStep(3);
  };

  const handleStep3Next = () => {
    const warn = Number(warningLevel);
    const crit = Number(criticalLevel);
    if (isNaN(crit) || crit < 0) {
      setErrorMsg("Please enter a valid critical threshold (>= 0).");
      return;
    }
    if (crit > warn) {
      setErrorMsg("Critical threshold should not exceed warning threshold.");
      return;
    }
    setErrorMsg(null);
    setAddStep(4);
  };

  // Save New Policy
  const handleSaveAdd = () => {
    if (!locationId) {
      setErrorMsg("Please select a facility location.");
      setAddStep(1);
      return;
    }
    const warn = Number(warningLevel);
    const crit = Number(criticalLevel);
    const oos = Number(outOfStockLevel);

    if (isNaN(warn) || warn < 0 || isNaN(crit) || crit < 0 || isNaN(oos) || oos < 0) {
      setErrorMsg("Please enter valid positive numbers for stock thresholds.");
      return;
    }

    if (crit > warn) {
      setErrorMsg("Critical threshold should not exceed warning threshold.");
      setAddStep(3);
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("ingredient_id", ingredient.id);
      formData.append("location_id", locationId);
      formData.append("warning_level", String(warn));
      formData.append("critical_level", String(crit));
      formData.append("out_of_stock_level", String(oos));

      const result = await createAlertPolicy(null, formData);
      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        resetAddForm();
      }
    });
  };

  // Save Edit Policy
  const handleSaveEdit = (policyId: string) => {
    const warn = Number(editWarningLevel);
    const crit = Number(editCriticalLevel);
    const oos = Number(editOutOfStockLevel);

    if (isNaN(warn) || warn < 0 || isNaN(crit) || crit < 0 || isNaN(oos) || oos < 0) {
      setErrorMsg("Please enter valid positive numbers for stock thresholds.");
      return;
    }

    if (crit > warn) {
      setErrorMsg("Critical threshold should not exceed warning threshold.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", policyId);
      formData.append("warning_level", String(warn));
      formData.append("critical_level", String(crit));
      formData.append("out_of_stock_level", String(oos));

      const result = await updateAlertPolicy(null, formData);
      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        setEditingId(null);
      }
    });
  };

  // Confirm Delete
  const handleConfirmDelete = (policyId: string) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", policyId);

      const result = await deleteAlertPolicy(null, formData);
      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        setDeletingId(null);
      }
    });
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/40 transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-xl flex-col bg-white shadow-2xl text-xs font-sans animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600 border border-amber-200/50">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-medium text-slate-900">Stock alert policies</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              <span className="text-slate-700 font-medium">{ingredient.name}</span>
              {baseUnit && (
                <>
                  <span className="mx-1.5 text-slate-300">•</span>
                  <span>Base unit:</span>{" "}
                  <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200/60 font-medium">
                    {baseUnit.name} ({baseUnit.symbol})
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            title="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Guidance Banner */}
        <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] leading-relaxed text-slate-600">
            <p className="text-slate-800 font-medium">Automated inventory thresholds</p>
            <p>
              Set reorder warnings and critical stock triggers per location. Values are measured in{" "}
              <span className="text-slate-800 font-medium">
                {baseUnit?.name} ({baseUnit?.symbol})
              </span>.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Section Subheading */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Location policies ({ingredientPolicies.length})
            </span>
          </div>

          {/* TABLE CONTAINER */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-medium select-none">
                  <th className="py-2.5 px-3.5 w-[30%]">Facility location</th>
                  <th className="py-2.5 px-3.5 w-[19%]">Warning</th>
                  <th className="py-2.5 px-3.5 w-[19%]">Critical</th>
                  <th className="py-2.5 px-3.5 w-[18%]">Stockout</th>
                  <th className="py-2.5 px-3.5 text-right w-[14%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* 1. EXISTING ROWS */}
                {ingredientPolicies.map((policy) => {
                  const location = locations.find((l) => l.id === policy.location_id);

                  // INLINE EDIT ROW
                  if (editingId === policy.id) {
                    return (
                      <tr key={policy.id} className="bg-amber-50/20 border-b border-amber-200">
                        <td colSpan={5} className="p-3 space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                            {/* Facility Location (4 cols) */}
                            <div className="sm:col-span-4 text-xs font-medium text-slate-900">
                              {location?.name || "Facility"}
                            </div>

                            {/* Warning (3 cols) */}
                            <div className="sm:col-span-3">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={editWarningLevel}
                                  onChange={(e) => setEditWarningLevel(e.target.value)}
                                  className="h-8 text-xs border-amber-400 bg-white focus:ring-1 focus:ring-amber-500 font-mono"
                                  placeholder="Warn"
                                />
                                <span className="text-slate-500 text-[11px] shrink-0 font-medium">
                                  {baseUnit.symbol}
                                </span>
                              </div>
                            </div>

                            {/* Critical (3 cols) */}
                            <div className="sm:col-span-3">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={editCriticalLevel}
                                  onChange={(e) => setEditCriticalLevel(e.target.value)}
                                  className="h-8 text-xs border-rose-300 bg-white focus:ring-1 focus:ring-rose-500 font-mono"
                                  placeholder="Crit"
                                />
                                <span className="text-slate-500 text-[11px] shrink-0 font-medium">
                                  {baseUnit.symbol}
                                </span>
                              </div>
                            </div>

                            {/* Stockout (2 cols) */}
                            <div className="sm:col-span-2">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={editOutOfStockLevel}
                                  onChange={(e) => setEditOutOfStockLevel(e.target.value)}
                                  className="h-8 text-xs border-slate-300 bg-white focus:border-slate-500 font-mono"
                                  placeholder="OOS"
                                />
                              </div>
                            </div>
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(policy.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 cursor-pointer shadow-2xs disabled:opacity-50"
                            >
                              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              <span>Save thresholds</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              <span>Cancel</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // INLINE DELETE CONFIRMATION ROW
                  if (deletingId === policy.id) {
                    return (
                      <tr key={policy.id} className="bg-rose-50/50">
                        <td colSpan={4} className="py-2.5 px-3.5 text-xs text-rose-800">
                          Delete alert policy for {location?.name}?
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(policy.id)}
                              disabled={isPending}
                              className="rounded bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                            >
                              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // READ-ONLY ROW
                  return (
                    <tr key={policy.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-2.5 px-3.5 text-slate-800 font-medium">
                        {location?.name || "Unknown location"}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-amber-600 font-medium">
                        {policy.warning_level} {baseUnit.symbol}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-rose-600 font-medium">
                        {policy.critical_level} {baseUnit.symbol}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-500">
                        {policy.out_of_stock_level} {baseUnit.symbol}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(policy)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-amber-700 transition-colors cursor-pointer"
                            title="Edit row"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingId(policy.id);
                              setEditingId(null);
                              setIsAdding(false);
                            }}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* 2. JIRA / LINEAR STYLE INLINE STEP-BY-STEP ADD ROW */}
                {isAdding && (
                  <tr className="bg-slate-50/40">
                    <td colSpan={5} className="p-2.5">
                      <div className="rounded-md border border-blue-500 bg-white shadow-xs px-3 py-2 transition-all">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          {/* Left: Icon */}
                          <div className="flex items-center shrink-0">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-blue-600 border border-blue-200/60">
                              {addStep === 1 && <Building2 className="h-3.5 w-3.5" />}
                              {addStep === 2 && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                              {addStep === 3 && <AlertCircle className="h-3.5 w-3.5 text-rose-600" />}
                              {addStep === 4 && <ShieldAlert className="h-3.5 w-3.5 text-slate-600" />}
                            </div>
                          </div>

                          {/* Center: Dynamic Step Question with Animation */}
                          <div className="flex-1 min-w-0">
                            {/* STEP 1: Select Facility Location */}
                            {addStep === 1 && (
                              <div className="flex items-center gap-2 animate-step-in w-full">
                                <div className="flex-1 min-w-[200px]">
                                  <Select
                                    value={locationId}
                                    onValueChange={(val) => {
                                      setLocationId(val);
                                      setErrorMsg(null);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-full border-slate-200 bg-slate-50/50 hover:bg-white text-xs focus:ring-1 focus:ring-blue-500">
                                      <SelectValue placeholder="Select facility location (e.g. Main Kitchen)..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableLocations.map((loc) => (
                                        <SelectItem
                                          key={loc.id}
                                          value={loc.id}
                                          className="text-xs font-medium text-slate-800 py-1.5 hover:bg-blue-50/70 hover:text-blue-700"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span>{loc.name}</span>
                                            {loc.code && (
                                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60 font-normal">
                                                {loc.code}
                                              </span>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            {/* STEP 2: Warning Threshold */}
                            {addStep === 2 && (
                              <div className="flex items-center gap-2 animate-step-in w-full">
                                <span className="text-xs text-amber-700 shrink-0 font-medium">
                                  Warning threshold:
                                </span>
                                <Input
                                  ref={warningInputRef}
                                  variant="underline"
                                  type="number"
                                  step="any"
                                  min="0"
                                  placeholder="e.g. 50"
                                  value={warningLevel}
                                  onChange={(e) => {
                                    setWarningLevel(e.target.value);
                                    setErrorMsg(null);
                                  }}
                                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleStep2Next();
                                    } else if (e.key === "Escape") {
                                      resetAddForm();
                                    }
                                  }}
                                  className="h-7 w-28 border-b-2 border-amber-500 focus:border-amber-700 font-mono text-xs font-medium text-slate-900 bg-transparent px-1 py-0.5"
                                />
                                <span className="text-xs text-slate-600 shrink-0">
                                  {baseUnit?.symbol} <span className="text-slate-400 text-[11px]">({baseUnit?.name})</span>
                                </span>
                              </div>
                            )}

                            {/* STEP 3: Critical Threshold */}
                            {addStep === 3 && (
                              <div className="flex items-center gap-2 animate-step-in w-full">
                                <span className="text-xs text-rose-700 shrink-0 font-medium">
                                  Critical threshold:
                                </span>
                                <Input
                                  ref={criticalInputRef}
                                  variant="underline"
                                  type="number"
                                  step="any"
                                  min="0"
                                  placeholder="e.g. 20"
                                  value={criticalLevel}
                                  onChange={(e) => {
                                    setCriticalLevel(e.target.value);
                                    setErrorMsg(null);
                                  }}
                                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleStep3Next();
                                    } else if (e.key === "Escape") {
                                      resetAddForm();
                                    }
                                  }}
                                  className="h-7 w-28 border-b-2 border-rose-500 focus:border-rose-700 font-mono text-xs font-medium text-slate-900 bg-transparent px-1 py-0.5"
                                />
                                <span className="text-xs text-slate-600 shrink-0">
                                  {baseUnit?.symbol} <span className="text-slate-400 text-[11px]">({baseUnit?.name})</span>
                                </span>
                              </div>
                            )}

                            {/* STEP 4: Stockout Threshold */}
                            {addStep === 4 && (
                              <div className="flex items-center gap-2 animate-step-in w-full">
                                <span className="text-xs text-slate-700 shrink-0 font-medium">
                                  Stockout threshold:
                                </span>
                                <Input
                                  ref={oosInputRef}
                                  variant="underline"
                                  type="number"
                                  step="any"
                                  min="0"
                                  placeholder="0"
                                  value={outOfStockLevel}
                                  onChange={(e) => setOutOfStockLevel(e.target.value)}
                                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveAdd();
                                    } else if (e.key === "Escape") {
                                      resetAddForm();
                                    }
                                  }}
                                  className="h-7 w-24 border-b-2 border-blue-500 focus:border-blue-700 font-mono text-xs font-medium text-slate-900 bg-transparent px-1 py-0.5"
                                />
                                <span className="text-xs text-slate-600 shrink-0">
                                  {baseUnit?.symbol} <span className="text-slate-400 text-[11px]">(Default 0)</span>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Right: Step Navigation & Create Button */}
                          <div className="flex items-center gap-1.5 shrink-0 justify-end">
                            {/* Back Button */}
                            {addStep > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setErrorMsg(null);
                                  setAddStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
                                }}
                                className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                                title="Back to previous step"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                <span>Back</span>
                              </button>
                            )}

                            {/* Next / Create Button */}
                            {addStep === 1 && (
                              <button
                                type="button"
                                onClick={handleStep1Next}
                                disabled={!locationId}
                                className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                              >
                                <span>Next</span>
                                <CornerDownLeft className="h-3 w-3 opacity-70" />
                              </button>
                            )}

                            {addStep === 2 && (
                              <button
                                type="button"
                                onClick={handleStep2Next}
                                disabled={!warningLevel || Number(warningLevel) < 0}
                                className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                              >
                                <span>Next</span>
                                <CornerDownLeft className="h-3 w-3 opacity-70" />
                              </button>
                            )}

                            {addStep === 3 && (
                              <button
                                type="button"
                                onClick={handleStep3Next}
                                disabled={!criticalLevel || Number(criticalLevel) < 0}
                                className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                              >
                                <span>Next</span>
                                <CornerDownLeft className="h-3 w-3 opacity-70" />
                              </button>
                            )}

                            {addStep === 4 && (
                              <button
                                type="button"
                                onClick={handleSaveAdd}
                                disabled={isPending}
                                className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                              >
                                {isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <span>Create</span>
                                    <CornerDownLeft className="h-3 w-3 opacity-70" />
                                  </>
                                )}
                              </button>
                            )}

                            {/* Cancel Button */}
                            <button
                              type="button"
                              onClick={resetAddForm}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                              title="Cancel (Esc)"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* 3. JIRA-STYLE "+ ADD LOCATION POLICY..." TRIGGER */}
                {!isAdding && availableLocations.length > 0 && (
                  <tr
                    onClick={() => {
                      setIsAdding(true);
                      setAddStep(1);
                      setEditingId(null);
                      setErrorMsg(null);
                      if (availableLocations.length > 0) setLocationId(availableLocations[0].id);
                    }}
                    className="group border-t border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors"
                  >
                    <td colSpan={5} className="py-2.5 px-3.5 text-xs text-slate-500 group-hover:text-blue-600">
                      <div className="flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <span>Add location threshold policy...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {/* EMPTY TABLE NOTICE */}
                {ingredientPolicies.length === 0 && !isAdding && availableLocations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No additional locations available for threshold policies.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
