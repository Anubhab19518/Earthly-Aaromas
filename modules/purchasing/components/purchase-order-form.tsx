"use client";

import { useState, useTransition, useMemo, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  Building2,
  Truck,
  Calendar,
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  AlertCircle,
  CornerDownLeft,
  Check,
  Percent,
  Layers,
  ArrowRightLeft,
  DollarSign,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  createPurchaseOrder,
  updatePurchaseOrder,
} from "@/modules/purchasing/services/purchase-order.actions";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Tooltip } from "@/shared/components/ui/tooltip";

interface LineItemDraft {
  id: string;
  ingredientId: string;
  ingredientName: string;
  sku: string;
  unitId: string;
  unitSymbol: string;
  quantity: number;
  expectedCost: number;
  taxCategoryId: string | null;
  taxCategoryName?: string;
  taxRatePercentage: number;
}

interface PurchaseOrderFormProps {
  suppliers: any[];
  locations: any[];
  ingredients?: any[];
  units?: any[];
  taxCategories?: any[];
  conversions?: any[];
  po?: any;
}

export function PurchaseOrderForm({
  suppliers,
  locations,
  ingredients = [],
  units = [],
  taxCategories = [],
  conversions = [],
  po,
}: PurchaseOrderFormProps) {
  const router = useRouter();
  const isEditing = !!po;
  const [isPending, startTransition] = useTransition();

  // PO Header State
  const [supplierId, setSupplierId] = useState(po?.supplier_id || "");
  const [locationId, setLocationId] = useState(po?.location_id || "");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(po?.expected_delivery_date || "");
  const [notes, setNotes] = useState(po?.notes || "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Line Items State (for new PO multi-item builder)
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Item Draft Sub-form State
  const [draftIngredientId, setDraftIngredientId] = useState("");
  const [draftUnitId, setDraftUnitId] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("1");
  const [draftCost, setDraftCost] = useState("0");
  const [draftTaxCategoryId, setDraftTaxCategoryId] = useState("");
  const [itemError, setItemError] = useState<string | null>(null);

  // Only show warehouse locations for PO destination
  const warehouseLocations = useMemo(() => {
    return locations.filter((loc) => {
      const typeCode = loc.location_types?.code;
      return !typeCode || typeCode === "WAREHOUSE" || typeCode === "CENTRAL_WAREHOUSE";
    });
  }, [locations]);

  // If no warehouse is selected yet, default to first available warehouse
  useEffect(() => {
    if (!locationId && warehouseLocations.length > 0) {
      setLocationId(warehouseLocations[0].id);
    }
  }, [locationId, warehouseLocations]);

  // Selected Supplier details
  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId),
    [suppliers, supplierId]
  );

  // Selected Warehouse details
  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === locationId),
    [locations, locationId]
  );

  // Filter compatible units when an ingredient is chosen
  const compatibleUnits = useMemo(() => {
    if (!draftIngredientId) return units;
    const ingredient = ingredients.find((i) => i.id === draftIngredientId);
    if (!ingredient) return units;

    const baseUnit = units.find((u) => u.id === ingredient.base_unit_id);
    const validUnitIds = new Set<string>();
    if (ingredient.base_unit_id) validUnitIds.add(ingredient.base_unit_id);

    // Add converted packaging units
    conversions
      .filter((c) => c.ingredient_id === draftIngredientId)
      .forEach((c) => validUnitIds.add(c.from_unit_id));

    // Also include units with same measurement category
    if (baseUnit) {
      units
        .filter((u) => u.measurement_category === baseUnit.measurement_category)
        .forEach((u) => validUnitIds.add(u.id));
    }

    const filtered = units.filter((u) => validUnitIds.has(u.id));
    return filtered.length > 0 ? filtered : units;
  }, [draftIngredientId, ingredients, units, conversions]);

  // When ingredient changes in draft, auto-populate standard cost & default unit
  const handleSelectDraftIngredient = (ingId: string) => {
    setDraftIngredientId(ingId);
    setItemError(null);
    const ing = ingredients.find((i) => i.id === ingId);
    if (ing) {
      const targetUnitId = ing.default_purchase_unit_id || ing.base_unit_id || "";
      setDraftUnitId(targetUnitId);
      if (ing.standard_cost) {
        setDraftCost(String(ing.standard_cost));
      }
    }
  };

  // Add Item to List
  const handleAddLineItem = () => {
    if (!draftIngredientId) {
      setItemError("Please select an ingredient.");
      return;
    }
    if (!draftUnitId) {
      setItemError("Please select a packaging unit.");
      return;
    }
    const qty = parseFloat(draftQuantity);
    if (isNaN(qty) || qty <= 0) {
      setItemError("Quantity must be greater than 0.");
      return;
    }
    const cost = parseFloat(draftCost);
    if (isNaN(cost) || cost < 0) {
      setItemError("Expected cost cannot be negative.");
      return;
    }

    const ing = ingredients.find((i) => i.id === draftIngredientId);
    const u = units.find((u) => u.id === draftUnitId);
    const taxCat = taxCategories.find((t) => t.id === draftTaxCategoryId);
    const rate = taxCat?.tax_rates?.[0]?.rate_percentage ? Number(taxCat.tax_rates[0].rate_percentage) : 0;

    const newItem: LineItemDraft = {
      id: Math.random().toString(36).substring(2, 9),
      ingredientId: draftIngredientId,
      ingredientName: ing?.name || "Unknown Item",
      sku: ing?.sku || "",
      unitId: draftUnitId,
      unitSymbol: u?.symbol || u?.name || "",
      quantity: qty,
      expectedCost: cost,
      taxCategoryId: draftTaxCategoryId || null,
      taxCategoryName: taxCat?.name,
      taxRatePercentage: rate,
    };

    setLineItems((prev) => [...prev, newItem]);
    // Reset draft fields
    setDraftIngredientId("");
    setDraftUnitId("");
    setDraftQuantity("1");
    setDraftCost("0");
    setDraftTaxCategoryId("");
    setIsAddingItem(false);
    setItemError(null);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Quick delivery date presets (+3 days, +1 week, +2 weeks)
  const setDeliveryPreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpectedDeliveryDate(d.toISOString().split("T")[0]);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + item.quantity * item.expectedCost, 0);
  }, [lineItems]);

  const estimatedTax = useMemo(() => {
    return lineItems.reduce((acc, item) => {
      const lineBase = item.quantity * item.expectedCost;
      return acc + lineBase * (item.taxRatePercentage / 100);
    }, 0);
  }, [lineItems]);

  const grandTotal = subtotal + estimatedTax;

  // Submit Handler
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supplierId) {
      setErrorMessage("Please select a supplier.");
      return;
    }
    if (!locationId) {
      setErrorMessage("Please select a destination warehouse.");
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);
      const formData = new FormData();
      if (isEditing) formData.append("id", po.id);
      formData.append("supplierId", supplierId);
      formData.append("locationId", locationId);
      if (expectedDeliveryDate) formData.append("expectedDeliveryDate", expectedDeliveryDate);
      if (notes) formData.append("notes", notes);

      // Attach initial line items if not editing
      if (!isEditing && lineItems.length > 0) {
        const payload = lineItems.map((item) => ({
          ingredientId: item.ingredientId,
          unitId: item.unitId,
          quantity: item.quantity,
          expectedCost: item.expectedCost,
          taxCategoryId: item.taxCategoryId,
        }));
        formData.append("items", JSON.stringify(payload));
      }

      const action = isEditing ? updatePurchaseOrder : createPurchaseOrder;
      const result = await action(null, formData);
      if (result?.message) {
        setErrorMessage(result.message);
      }
    });
  };

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* 1. Jira-Style Breadcrumbs & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Link href="/purchase-orders" className="hover:text-blue-600 hover:underline transition-colors">
              Purchase Orders
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-900">{isEditing ? `Edit PO #${po.id.substring(0, 8)}` : "New Purchase Order"}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
              <ClipboardList className="h-4 w-4" />
            </div>
            <h1 className="text-base font-semibold text-slate-900 leading-tight">
              {isEditing ? "Update Purchase Order" : "Create Purchase Order"}
            </h1>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
              DRAFT
            </span>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isPending || !supplierId || !locationId}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <span>{isEditing ? "Save changes" : "Create PO"}</span>
                <CornerDownLeft className="h-3 w-3 opacity-70" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Main 2-Column Jira Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Main Form & Line Items (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* A. Supplier & Logistics Card */}
          <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-blue-600" />
                <h3 className="text-xs font-semibold text-slate-900">Vendor & Logistics</h3>
              </div>
              <span className="text-[11px] text-slate-400">Step 1 of 2</span>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Supplier Selector */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Supplier <span className="text-rose-500">*</span>
                  </label>
                  <Select value={supplierId} onValueChange={(val) => setSupplierId(val)}>
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                      <SelectValue placeholder="Select a supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs font-medium py-1.5">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{s.name}</span>
                            {s.gstin && (
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                {s.gstin}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Supplier Context Chip */}
                  {selectedSupplier && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200/60">
                      {selectedSupplier.phone && <span>📞 {selectedSupplier.phone}</span>}
                      {selectedSupplier.email && <span>✉️ {selectedSupplier.email}</span>}
                      {selectedSupplier.gstin && <span>GSTIN: {selectedSupplier.gstin}</span>}
                    </div>
                  )}
                </div>

                {/* 2. Destination Warehouse */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Destination Warehouse <span className="text-rose-500">*</span>
                  </label>
                  <Select value={locationId} onValueChange={(val) => setLocationId(val)}>
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                      <SelectValue placeholder="Select warehouse facility..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouseLocations.map((l) => (
                        <SelectItem key={l.id} value={l.id} className="text-xs font-medium py-1.5">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{l.name}</span>
                            <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200/50">
                              {l.code || "WAREHOUSE"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 3. Expected Delivery Date & Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Expected Delivery Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="w-full h-8 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1 md:pt-4">
                  <span className="text-[10px] font-medium text-slate-400 block">Quick Scheduling</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryPreset(3)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryPreset(7)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                    >
                      +1 Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryPreset(14)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                    >
                      +2 Weeks
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Notes / Instructions */}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700">
                  Notes / Instructions for Supplier
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery gate instructions, special packaging, payment terms..."
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* B. Line Items Multi-Item Builder (Jira-style Table) */}
          {!isEditing && (
            <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-blue-600" />
                  <h3 className="text-xs font-semibold text-slate-900">
                    Line Items
                  </h3>
                  <span className="flex h-4 px-1.5 items-center justify-center rounded text-[10px] font-mono bg-slate-200 text-slate-700">
                    {lineItems.length}
                  </span>
                </div>

                {!isAddingItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingItem(true);
                      setItemError(null);
                    }}
                    className="flex items-center gap-1 rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200/60"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add item</span>
                  </button>
                )}
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-500 select-none">
                      <th className="py-2 px-3 border-r border-slate-200/80 w-[30%]">Ingredient / Item</th>
                      <th className="py-2 px-3 border-r border-slate-200/80 w-[18%]">Packaging unit</th>
                      <th className="py-2 px-3 border-r border-slate-200/80 w-[12%]">Qty</th>
                      <th className="py-2 px-3 border-r border-slate-200/80 w-[14%]">Cost (₹)</th>
                      <th className="py-2 px-3 border-r border-slate-200/80 w-[12%]">Tax</th>
                      <th className="py-2 px-3 border-r border-slate-200/80 w-[14%]">Total (₹)</th>
                      <th className="py-2 px-2 text-right w-[4%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 font-normal text-slate-800">
                    {lineItems.length === 0 && !isAddingItem ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          <p className="text-xs font-medium text-slate-600">No items added yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            You can add items now or finalize them after creating the draft.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAddingItem(true)}
                            className="mt-2 text-blue-600 hover:underline text-xs font-medium cursor-pointer"
                          >
                            + Add first line item
                          </button>
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item, idx) => {
                        const lineBase = item.quantity * item.expectedCost;
                        const lineTotal = lineBase + lineBase * (item.taxRatePercentage / 100);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                            <td className="py-2 px-3 border-r border-slate-200/80 font-medium text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{item.ingredientName}</span>
                                {item.sku && (
                                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                    {item.sku}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200/80 font-mono text-slate-600">
                              {item.unitSymbol}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200/80 font-mono text-slate-900 font-medium">
                              {item.quantity}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200/80 font-mono text-slate-700">
                              ₹{item.expectedCost.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200/80 text-[11px] text-slate-500">
                              {item.taxRatePercentage > 0 ? `${item.taxRatePercentage}%` : "0%"}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200/80 font-mono text-blue-600 font-medium">
                              ₹{lineTotal.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(item.id)}
                                className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* JIRA-STYLE INLINE ADD ITEM ROW */}
                    {isAddingItem && (
                      <tr className="bg-blue-50/20 border-t border-b border-blue-200">
                        <td colSpan={7} className="p-3 space-y-2.5">
                          {itemError && (
                            <div className="text-[11px] text-rose-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>{itemError}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                            {/* 1. Ingredient (4 cols) */}
                            <div className="sm:col-span-4 space-y-1">
                              <label className="text-[10px] font-medium text-slate-500 uppercase">Ingredient</label>
                              <Select
                                value={draftIngredientId}
                                onValueChange={(val) => handleSelectDraftIngredient(val)}
                              >
                                <SelectTrigger className="h-7 text-xs bg-white border-slate-200">
                                  <SelectValue placeholder="Select raw material..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {ingredients.map((ing) => (
                                    <SelectItem key={ing.id} value={ing.id} className="text-xs font-medium">
                                      <div className="flex items-center justify-between w-full gap-2">
                                        <span>{ing.name}</span>
                                        {ing.sku && (
                                          <span className="font-mono text-[10px] text-slate-400">{ing.sku}</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* 2. Packaging Unit (3 cols) */}
                            <div className="sm:col-span-3 space-y-1">
                              <label className="text-[10px] font-medium text-slate-500 uppercase">Unit</label>
                              <Select value={draftUnitId} onValueChange={(val) => setDraftUnitId(val)}>
                                <SelectTrigger className="h-7 text-xs bg-white border-slate-200">
                                  <SelectValue placeholder="Unit..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {compatibleUnits.map((u) => (
                                    <SelectItem key={u.id} value={u.id} className="text-xs">
                                      {u.name} ({u.symbol})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* 3. Quantity (1.5 cols) */}
                            <div className="sm:col-span-2 space-y-1">
                              <label className="text-[10px] font-medium text-slate-500 uppercase">Qty</label>
                              <Input
                                variant="underline"
                                type="number"
                                step="any"
                                min="0.001"
                                value={draftQuantity}
                                onChange={(e) => setDraftQuantity(e.target.value)}
                                className="h-7 text-xs font-mono font-medium text-slate-900 border-b-2 border-blue-500 px-1"
                              />
                            </div>

                            {/* 4. Unit Cost (1.5 cols) */}
                            <div className="sm:col-span-2 space-y-1">
                              <label className="text-[10px] font-medium text-slate-500 uppercase">Cost (₹)</label>
                              <Input
                                variant="underline"
                                type="number"
                                step="any"
                                min="0"
                                value={draftCost}
                                onChange={(e) => setDraftCost(e.target.value)}
                                className="h-7 text-xs font-mono font-medium text-slate-900 border-b-2 border-blue-500 px-1"
                              />
                            </div>

                            {/* 5. Tax (1 col) */}
                            <div className="sm:col-span-1 space-y-1">
                              <label className="text-[10px] font-medium text-slate-500 uppercase">Tax</label>
                              <Select value={draftTaxCategoryId} onValueChange={(val) => setDraftTaxCategoryId(val)}>
                                <SelectTrigger className="h-7 text-xs bg-white border-slate-200 px-1">
                                  <SelectValue placeholder="Tax" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="" className="text-xs">0% None</SelectItem>
                                  {taxCategories.map((tc) => {
                                    const rate = tc.tax_rates?.[0]?.rate_percentage || 0;
                                    return (
                                      <SelectItem key={tc.id} value={tc.id} className="text-xs">
                                        {tc.name} ({rate}%)
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                            <button
                              type="button"
                              onClick={handleAddLineItem}
                              className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
                            >
                              <Check className="h-3 w-3" />
                              <span>Add to order</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingItem(false);
                                setItemError(null);
                              }}
                              className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Summary & Order Breakdown Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. Financial Estimate Card */}
          <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                <h3 className="text-xs font-semibold text-slate-900">Order Summary</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                ESTIMATE
              </span>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Line items count</span>
                  <span className="font-mono font-medium text-slate-900">{lineItems.length}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Base subtotal</span>
                  <span className="font-mono font-medium text-slate-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Estimated taxes</span>
                  <span className="font-mono font-medium text-slate-900">₹{estimatedTax.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Total expected cost</span>
                  <span className="text-[10px] text-slate-400">Incl. estimated taxes</span>
                </div>
                <span className="font-mono text-base font-bold text-blue-600">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Main Submit Button */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isPending || !supplierId || !locationId}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 py-2 px-3 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{isEditing ? "Update Purchase Order" : "Create Purchase Order"}</span>
                    <CornerDownLeft className="h-3.5 w-3.5 opacity-70" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Destination Warehouse Preview Card */}
          <div className="bg-white rounded-md border border-slate-200 shadow-xs p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>Receiving Facility</span>
            </div>
            {selectedLocation ? (
              <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200/60 space-y-0.5">
                <p className="font-semibold text-slate-900">{selectedLocation.name}</p>
                {selectedLocation.address && <p className="text-slate-500">{selectedLocation.address}</p>}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">Select a warehouse to view destination</p>
            )}
          </div>

          {/* 3. Keyboard Shortcuts Helper */}
          <div className="bg-slate-50 rounded-md border border-slate-200/80 p-3 space-y-1 text-[11px] text-slate-500">
            <p className="font-medium text-slate-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-600" />
              <span>Pro-tips</span>
            </p>
            <div className="flex items-center justify-between">
              <span>Quick Create:</span>
              <kbd className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-700 shadow-2xs">
                ⌘ + Enter
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Cancel / Back:</span>
              <kbd className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-700 shadow-2xs">
                Esc
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
