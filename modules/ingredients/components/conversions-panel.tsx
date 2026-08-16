"use client";

import { useState, useEffect, useTransition, useRef, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import {
  createConversion,
  updateConversion,
  deleteConversion,
} from "@/modules/ingredients/services/ingredient-conversion.actions";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Tooltip } from "@/shared/components/ui/tooltip";
import {
  ArrowRightLeft,
  Plus,
  X,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Info,
  Scale,
  FileText,
  ChevronLeft,
  CornerDownLeft,
  Sparkles,
  Ban,
} from "lucide-react";

const CATEGORY_NAMES: Record<string, string> = {
  WEIGHT: "Weight units",
  VOLUME: "Volume units",
  COUNT: "Count units",
  COOKING: "Cooking units",
};

export function CategorizedUnitSelectItems({
  units,
  baseUnit,
}: {
  units: Unit[];
  baseUnit?: Unit;
}) {
  const categories = ["WEIGHT", "VOLUME", "COUNT", "COOKING"] as const;
  const matchingCategory = baseUnit?.measurement_category;

  // Separate compatible vs incompatible categories
  const compatibleCategories = categories.filter((cat) => cat === matchingCategory);
  const otherCategories = categories.filter((cat) => cat !== matchingCategory);

  return (
    <>
      {/* 1. COMPATIBLE UNITS (Matching Base Unit Category) */}
      {compatibleCategories.map((cat) => {
        const catUnits = units.filter((u) => u.measurement_category === cat);
        if (catUnits.length === 0) return null;

        return (
          <SelectGroup key={cat} className="py-1">
            <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-50/50 rounded-xs mb-0.5">
              <span>{CATEGORY_NAMES[cat] || cat}</span>
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                Compatible
              </span>
            </div>
            {catUnits.map((u) => {
              const isBaseUnit = baseUnit && u.id === baseUnit.id;
              const isDisabled = isBaseUnit || u.status === "INACTIVE";

              return (
                <SelectItem
                  key={u.id}
                  value={u.id}
                  disabled={isDisabled}
                  className={
                    isDisabled
                      ? "cursor-not-allowed opacity-50 text-slate-400 py-1.5"
                      : "text-slate-800 font-medium py-1.5 hover:bg-blue-50/70 hover:text-blue-700"
                  }
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className={isDisabled ? "text-slate-400 font-normal" : "text-slate-800 font-medium"}>
                        {u.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60 font-normal">
                        {u.symbol}
                      </span>
                    </div>

                    {isBaseUnit ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-normal shrink-0">
                        <Ban className="h-3 w-3 text-slate-400" />
                        <span>Base unit</span>
                      </span>
                    ) : null}
                  </div>
                </SelectItem>
              );
            })}
          </SelectGroup>
        );
      })}

      {/* SEPARATOR */}
      {otherCategories.length > 0 && <SelectSeparator className="my-1" />}

      {/* 2. INCOMPATIBLE CATEGORIES */}
      {otherCategories.map((cat) => {
        const catUnits = units.filter((u) => u.measurement_category === cat);
        if (catUnits.length === 0) return null;

        return (
          <SelectGroup key={cat} className="py-1">
            <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-normal text-slate-400">
              <span>{CATEGORY_NAMES[cat] || cat}</span>
              <span className="text-[10px] text-slate-400">Incompatible</span>
            </div>
            {catUnits.map((u) => (
              <SelectItem
                key={u.id}
                value={u.id}
                disabled={true}
                className="cursor-not-allowed opacity-40 text-slate-400 py-1.5"
              >
                <div className="flex items-center justify-between w-full gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-normal">{u.name}</span>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100/60 px-1.5 py-0.2 rounded font-normal">
                      {u.symbol}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-normal shrink-0">
                    <Ban className="h-3 w-3 text-slate-300" />
                    <span>Different category</span>
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        );
      })}
    </>
  );
}

interface ConversionsPanelProps {
  ingredient: Ingredient;
  conversions: IngredientUnitConversion[];
  units: Unit[];
  open: boolean;
  onClose: () => void;
}

export function ConversionsPanel({
  ingredient,
  conversions,
  units,
  open,
  onClose,
}: ConversionsPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Progressive Step-by-Step Inline Creation State
  const [isAdding, setIsAdding] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2 | 3>(1);
  const [fromUnitId, setFromUnitId] = useState("");
  const [conversionFactor, setConversionFactor] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inputs refs for focusing
  const factorInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);

  // Inline Editing Row State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFromUnitId, setEditFromUnitId] = useState("");
  const [editConversionFactor, setEditConversionFactor] = useState<string>("");
  const [editNotes, setEditNotes] = useState("");

  // Inline Deleting Row State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus inputs on step changes
  useEffect(() => {
    if (isAdding) {
      if (addStep === 2) {
        setTimeout(() => factorInputRef.current?.focus(), 50);
      } else if (addStep === 3) {
        setTimeout(() => notesInputRef.current?.focus(), 50);
      }
    }
  }, [isAdding, addStep]);

  if (!open || !mounted) return null;

  const baseUnit = units.find((u) => u.id === ingredient.base_unit_id);
  const ingredientConversions = conversions.filter(
    (c) => c.ingredient_id === ingredient.id
  );

  // Available packaging units for conversion (matching category of base unit)
  const availableUnits = units.filter((u) => {
    if (u.id === ingredient.base_unit_id) return false;
    if (baseUnit && u.measurement_category !== baseUnit.measurement_category) {
      return false;
    }
    return true;
  });

  const selectedPackagingUnit = units.find((u) => u.id === fromUnitId);

  const resetAddForm = () => {
    setIsAdding(false);
    setAddStep(1);
    setFromUnitId("");
    setConversionFactor("");
    setNotes("");
    setErrorMsg(null);
  };

  const startEdit = (conv: IngredientUnitConversion) => {
    setEditingId(conv.id);
    setEditFromUnitId(conv.from_unit_id);
    setEditConversionFactor(String(conv.conversion_factor));
    setEditNotes(conv.notes || "");
    setErrorMsg(null);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrorMsg(null);
  };

  // Step advancement logic
  const handleStep1Next = () => {
    if (!fromUnitId) {
      setErrorMsg("Please select a packaging unit.");
      return;
    }
    setErrorMsg(null);
    setAddStep(2);
  };

  const handleStep2Next = () => {
    const factorNum = Number(conversionFactor);
    if (!conversionFactor || isNaN(factorNum) || factorNum <= 0) {
      setErrorMsg("Please enter a valid conversion factor greater than 0.");
      return;
    }
    setErrorMsg(null);
    setAddStep(3);
  };

  // Submit Add
  const handleSaveAdd = () => {
    if (!fromUnitId) {
      setErrorMsg("Please select a packaging unit.");
      setAddStep(1);
      return;
    }
    const factorNum = Number(conversionFactor);
    if (!conversionFactor || isNaN(factorNum) || factorNum <= 0) {
      setErrorMsg("Please enter a valid conversion factor greater than 0.");
      setAddStep(2);
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("ingredient_id", ingredient.id);
      formData.append("from_unit_id", fromUnitId);
      formData.append("to_unit_id", ingredient.base_unit_id);
      formData.append("conversion_factor", String(factorNum));
      if (notes.trim()) formData.append("notes", notes.trim());

      const result = await createConversion(null, formData);
      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        resetAddForm();
      }
    });
  };

  // Submit Edit
  const handleSaveEdit = (convId: string) => {
    if (!editFromUnitId) {
      setErrorMsg("Please select a packaging unit.");
      return;
    }
    const factorNum = Number(editConversionFactor);
    if (!editConversionFactor || isNaN(factorNum) || factorNum <= 0) {
      setErrorMsg("Please enter a valid conversion factor greater than 0.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", convId);
      formData.append("ingredient_id", ingredient.id);
      formData.append("from_unit_id", editFromUnitId);
      formData.append("to_unit_id", ingredient.base_unit_id);
      formData.append("conversion_factor", String(factorNum));
      if (editNotes.trim()) formData.append("notes", editNotes.trim());

      const result = await updateConversion(null, formData);
      if (result?.message) {
        setErrorMsg(result.message);
      } else {
        setEditingId(null);
      }
    });
  };

  // Submit Delete
  const handleConfirmDelete = (convId: string) => {
    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("id", convId);

      const result = await deleteConversion(null, formData);
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
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/50">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-medium text-slate-900">Unit conversions</h2>
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
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] leading-relaxed text-slate-600">
            <p className="text-slate-800 font-medium">Packaging unit mapping</p>
            <p>
              Base unit for {ingredient.name} is{" "}
              <span className="text-slate-800 font-medium">
                {baseUnit?.name} ({baseUnit?.symbol})
              </span>. Configure bulk packaging ratios to auto-calculate inventory amounts upon receiving.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Section Subheading */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Configured packaging ratios ({ingredientConversions.length})
            </span>
          </div>

          {/* TABLE CONTAINER */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-medium select-none">
                  <th className="py-2.5 px-3.5 w-[34%]">Packaging unit</th>
                  <th className="py-2.5 px-3.5 w-[28%]">Equivalent ratio</th>
                  <th className="py-2.5 px-3.5 w-[24%]">Notes</th>
                  <th className="py-2.5 px-3.5 text-right w-[14%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* 1. EXISTING ROWS */}
                {ingredientConversions.map((conv) => {
                  const fromUnit = units.find((u) => u.id === conv.from_unit_id);
                  const toUnit = units.find((u) => u.id === conv.to_unit_id);

                  // INLINE EDIT ROW
                  if (editingId === conv.id) {
                    return (
                      <tr key={conv.id} className="bg-blue-50/20 border-b border-blue-200">
                        <td colSpan={4} className="p-3 space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            {/* Packaging Unit (5 cols) */}
                            <div className="sm:col-span-5">
                              <Select value={editFromUnitId} onValueChange={setEditFromUnitId}>
                                <SelectTrigger className="h-8 text-xs border-blue-400 bg-white focus:ring-1 focus:ring-blue-500">
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  <CategorizedUnitSelectItems units={units} baseUnit={baseUnit} />
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Factor (4 cols) */}
                            <div className="sm:col-span-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-xs">=</span>
                                <Input
                                  type="number"
                                  step="any"
                                  value={editConversionFactor}
                                  onChange={(e) => setEditConversionFactor(e.target.value)}
                                  className="h-8 text-xs border-blue-400 bg-white focus:ring-1 focus:ring-blue-500 font-mono"
                                  placeholder="Factor"
                                />
                                <span className="text-slate-500 text-[11px] shrink-0 font-medium">
                                  {toUnit?.symbol || baseUnit?.symbol}
                                </span>
                              </div>
                            </div>

                            {/* Notes (3 cols) */}
                            <div className="sm:col-span-3">
                              <Input
                                type="text"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="h-8 text-xs border-slate-300 bg-white focus:border-blue-500"
                                placeholder="Notes (optional)"
                              />
                            </div>
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(conv.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer shadow-2xs disabled:opacity-50"
                            >
                              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              <span>Save changes</span>
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
                  if (deletingId === conv.id) {
                    return (
                      <tr key={conv.id} className="bg-rose-50/50">
                        <td colSpan={3} className="py-2.5 px-3.5 text-xs text-rose-800">
                          Delete conversion 1 {fromUnit?.name} = {conv.conversion_factor} {toUnit?.symbol}?
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(conv.id)}
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
                    <tr key={conv.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-2.5 px-3.5 text-slate-800 font-medium">
                        1 {fromUnit?.name || fromUnit?.symbol || "?"}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-blue-600 font-medium">
                        = {conv.conversion_factor} {toUnit?.symbol ?? "?"}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-500 text-[11px] max-w-[150px]">
                        {conv.notes ? (
                          <Tooltip content={conv.notes}>
                            <span className="truncate block max-w-[150px] cursor-default text-slate-600">
                              {conv.notes}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(conv)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Edit row"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingId(conv.id);
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
                    <td colSpan={4} className="p-2.5">
                      <div className="rounded-md border border-blue-500 bg-white shadow-xs px-3 py-2 transition-all">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          {/* Left: Icon */}
                          <div className="flex items-center shrink-0">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-blue-600 border border-blue-200/60">
                              {addStep === 1 && <Scale className="h-3.5 w-3.5" />}
                              {addStep === 2 && <ArrowRightLeft className="h-3.5 w-3.5" />}
                              {addStep === 3 && <FileText className="h-3.5 w-3.5" />}
                            </div>
                          </div>

                          {/* Center: Dynamic Step Question with Animation */}
                          <div className="flex-1 min-w-0">
                            {/* STEP 1: Select Packaging Unit */}
                            {addStep === 1 && (
                              <div className="flex items-center gap-2 animate-step-in w-full">
                                <div className="flex-1 min-w-[200px]">
                                  <Select
                                    value={fromUnitId}
                                    onValueChange={(val) => {
                                      setFromUnitId(val);
                                      setErrorMsg(null);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-full border-slate-200 bg-slate-50/50 hover:bg-white text-xs focus:ring-1 focus:ring-blue-500">
                                      <SelectValue placeholder="Select packaging unit (e.g. Box, Sack, Carton)..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <CategorizedUnitSelectItems units={units} baseUnit={baseUnit} />
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            {/* STEP 2: Conversion Ratio Factor */}
                            {addStep === 2 && (
                              <div className="flex items-center gap-2 animate-step-in w-full">
                                <span className="text-xs text-slate-700 shrink-0 font-medium">
                                  1 {selectedPackagingUnit?.name || "Unit"} =
                                </span>
                                <Input
                                  ref={factorInputRef}
                                  variant="underline"
                                  type="number"
                                  step="any"
                                  min="0.0001"
                                  placeholder="e.g. 1000"
                                  value={conversionFactor}
                                  onChange={(e) => {
                                    setConversionFactor(e.target.value);
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
                                  className="h-7 w-28 border-b-2 border-blue-500 focus:border-blue-700 font-mono text-xs font-medium text-slate-900 bg-transparent px-1 py-0.5"
                                />
                                <span className="text-xs text-slate-600 shrink-0">
                                  {baseUnit?.symbol} <span className="text-slate-400 text-[11px]">({baseUnit?.name})</span>
                                </span>
                              </div>
                            )}

                            {/* STEP 3: Optional Notes */}
                            {addStep === 3 && (
                              <div className="flex items-center gap-2 animate-step-in w-full">
                                <Input
                                  ref={notesInputRef}
                                  variant="underline"
                                  type="text"
                                  placeholder="Add packaging notes or specs (optional)..."
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveAdd();
                                    } else if (e.key === "Escape") {
                                      resetAddForm();
                                    }
                                  }}
                                  className="h-7 flex-1 border-b-2 border-blue-500 focus:border-blue-700 text-xs font-normal text-slate-900 bg-transparent px-1 py-0.5"
                                />
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
                                  setAddStep((prev) => (prev - 1) as 1 | 2 | 3);
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
                                disabled={!fromUnitId}
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
                                disabled={!conversionFactor || Number(conversionFactor) <= 0}
                                className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                              >
                                <span>Next</span>
                                <CornerDownLeft className="h-3 w-3 opacity-70" />
                              </button>
                            )}

                            {addStep === 3 && (
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

                {/* 3. JIRA-STYLE "+ ADD PACKAGING UNIT..." TRIGGER */}
                {!isAdding && availableUnits.length > 0 && (
                  <tr
                    onClick={() => {
                      setIsAdding(true);
                      setAddStep(1);
                      setEditingId(null);
                      setErrorMsg(null);
                    }}
                    className="group border-t border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors"
                  >
                    <td colSpan={4} className="py-2.5 px-3.5 text-xs text-slate-500 group-hover:text-blue-600">
                      <div className="flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <span>Add packaging unit...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {/* EMPTY TABLE NOTICE */}
                {ingredientConversions.length === 0 && !isAdding && availableUnits.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No additional packaging units available for conversion.
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
