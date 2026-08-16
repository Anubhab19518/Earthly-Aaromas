"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  Calendar,
  Layers,
  Printer,
  CheckCircle2,
  XCircle,
  Package,
  Building2,
  Truck,
  MapPin,
  Clock,
  DollarSign,
  Scale,
  ExternalLink,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { GoodsReceipt, GoodsReceiptItem } from "@/modules/receiving/schemas/grn.schema";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { TaxCategory } from "@/modules/taxes/schemas/tax.schema";
import {
  cancelGrn,
  deleteGrnItem,
  updateGrnRemarks,
} from "@/modules/receiving/services/grn.actions";
import { GrnItemForm } from "./grn-item-form";
import { PostGrnDialog } from "./post-grn-dialog";
import { CommentSection } from "@/modules/shared/components/comment-section";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "POSTED":
      return (
        <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white shadow-2xs">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>POSTED</span>
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white shadow-2xs">
          <XCircle className="h-3.5 w-3.5" />
          <span>CANCELLED</span>
        </span>
      );
    case "DRAFT":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold bg-slate-200 text-slate-700">
          <Clock className="h-3.5 w-3.5" />
          <span>DRAFT</span>
        </span>
      );
  }
}

interface GrnDetailViewProps {
  grn: GoodsReceipt;
  items: GoodsReceiptItem[];
  suppliers: Supplier[];
  warehouseLocations: Location[];
  ingredients: Ingredient[];
  conversions: IngredientUnitConversion[];
  units: Unit[];
  taxCategories: TaxCategory[];
  comments?: any[];
}

export function GrnDetailView({
  grn,
  items,
  suppliers,
  warehouseLocations,
  ingredients,
  conversions,
  units,
  taxCategories,
  comments,
}: GrnDetailViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<GoodsReceiptItem | null>(null);
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isItemsOpen, setIsItemsOpen] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(true);

  // Remarks inline editing state
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [remarksValue, setRemarksValue] = useState(grn.remarks || "");
  const [isPendingRemarks, startRemarksTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();

  const isDraft = grn.status === "DRAFT";
  const isPosted = grn.status === "POSTED";

  const supplier = suppliers.find((s) => s.id === grn.supplier_id);
  const location = warehouseLocations.find((l) => l.id === grn.warehouse_location_id);

  const getIngredient = (id: string) => ingredients.find((i) => i.id === id);
  const getUnit = (id: string) => units.find((u) => u.id === id);

  let subtotal = 0;
  let taxTotal = 0;

  items.forEach((item) => {
    const baseLine = Number(item.line_total);
    subtotal += baseLine;
    if (item.tax_category_id) {
      const tc = taxCategories.find((t) => t.id === item.tax_category_id);
      const rate = (tc as any)?.tax_rates?.[0]?.rate_percentage || 0;
      taxTotal += baseLine * (rate / 100);
    }
  });

  const grandTotal = subtotal + taxTotal;

  const handleSaveRemarks = () => {
    startRemarksTransition(async () => {
      const result = await updateGrnRemarks(grn.id, remarksValue);
      if (!result?.message) {
        setIsEditingRemarks(false);
      }
    });
  };

  const handleCancelGrn = () => {
    if (!confirm("Are you sure you want to cancel this Goods Receipt? This cannot be undone.")) return;
    startCancelTransition(async () => {
      const fd = new FormData();
      fd.append("id", grn.id);
      await cancelGrn(null, fd);
    });
  };

  return (
    <div className="max-w-[1500px] mx-auto py-2 bg-transparent min-h-screen text-xs space-y-4 font-sans">
      {/* 1. Jira Breadcrumbs Bar */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium print:hidden">
        <Link href="/receiving" className="hover:text-blue-600 hover:underline flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
          <span>Goods Receipts</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <div className="flex items-center gap-1 text-slate-900 font-semibold">
          <span>{grn.grn_number}</span>
        </div>
      </div>

      {/* 2. Main 2-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* LEFT COLUMN: Main Receipt Work Area (2 Cols) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Header Title & Top Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                {grn.grn_number}
              </h1>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {grn.status}
              </span>
              {grn.purchase_order_id && (
                <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/50">
                  Ref: PO Linked
                </span>
              )}
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-2.5 py-1.5 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                title="Print Delivery Receipt"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>

              {isDraft && (
                <>
                  <button
                    type="button"
                    onClick={handleCancelGrn}
                    disabled={isCancelling}
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Cancel GRN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPostOpen(true)}
                    disabled={items.length === 0}
                    className="flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Post & Receive Stock</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Section 1: Line Items Table (Ordered / Received Items) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 cursor-pointer hover:bg-slate-100/70 py-1 px-2 rounded transition-colors"
                onClick={() => setIsItemsOpen(!isItemsOpen)}
              >
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform ${
                    isItemsOpen ? "" : "-rotate-90"
                  }`}
                />
                <span>Received Inventory Items</span>
                <span className="flex h-4 px-1.5 items-center justify-center rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200/60 ml-1">
                  {items.length}
                </span>
              </button>

              {isDraft && (
                <button
                  type="button"
                  onClick={() => {
                    setEditItem(null);
                    setIsAddOpen(true);
                  }}
                  className="flex items-center gap-1 rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-200/60 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add line item</span>
                </button>
              )}
            </div>

            {isItemsOpen && (
              <div className="space-y-2">
                {/* Progress Metric */}
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isPosted ? "bg-emerald-600" : grn.status === "CANCELLED" ? "bg-rose-600" : "bg-blue-600"
                      } rounded-full transition-all duration-500`}
                      style={{ width: isPosted ? "100%" : isDraft ? "50%" : "0%" }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isPosted ? "100% Stock Received" : isDraft ? "Receipt in Draft" : "Cancelled"}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 border border-slate-200 rounded-md bg-white">
                    <Package className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-slate-600">No items recorded in this receipt</p>
                    {isDraft && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditItem(null);
                          setIsAddOpen(true);
                        }}
                        className="mt-1.5 text-blue-600 hover:underline text-xs font-medium cursor-pointer"
                      >
                        + Click to add your first received ingredient
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500 select-none">
                          <th className="px-3.5 py-2">Ingredient</th>
                          <th className="px-3.5 py-2 w-[14%]">Received Qty</th>
                          <th className="px-3.5 py-2 w-[14%]">Packaging Unit</th>
                          <th className="px-3.5 py-2 w-[18%] font-mono">Stock Converted</th>
                          <th className="px-3.5 py-2 w-[14%] text-right">Unit cost</th>
                          <th className="px-3.5 py-2 w-[16%] text-right">Line total</th>
                          {isDraft && <th className="px-3 py-2 text-right w-[6%]"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 text-xs text-slate-800">
                        {items.map((item) => {
                          const ing = getIngredient(item.ingredient_id);
                          const purchaseUnit = getUnit(item.purchase_unit_id);
                          const baseUnit = ing ? getUnit(ing.base_unit_id) : null;
                          const lineTotal = Number(item.line_total);

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                              <td className="px-3.5 py-2.5 font-medium text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{ing?.name || "Unknown"}</span>
                                  {ing?.sku && (
                                    <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                      {ing.sku}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-3.5 py-2.5 font-mono font-medium text-slate-900">
                                {item.received_quantity}
                              </td>

                              <td className="px-3.5 py-2.5 text-slate-600">
                                {purchaseUnit?.name || purchaseUnit?.symbol || "-"}
                              </td>

                              <td className="px-3.5 py-2.5 font-mono text-blue-700 bg-blue-50/40">
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <Scale className="h-3 w-3 text-blue-500" />
                                  <span>
                                    {Number(item.converted_base_quantity).toFixed(3)}{" "}
                                    {baseUnit?.symbol || ""}
                                  </span>
                                </span>
                              </td>

                              <td className="px-3.5 py-2.5 text-slate-700 text-right font-mono">
                                ₹{Number(item.unit_cost).toFixed(2)}
                              </td>

                              <td className="px-3.5 py-2.5 text-blue-600 text-right font-mono font-medium">
                                ₹{lineTotal.toFixed(2)}
                              </td>

                              {isDraft && (
                                <td className="px-3 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditItem(item);
                                        setIsAddOpen(true);
                                      }}
                                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                      title="Edit item"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}

                        {/* Quick Trigger Row in Draft Mode */}
                        {isDraft && (
                          <tr
                            onClick={() => {
                              setEditItem(null);
                              setIsAddOpen(true);
                            }}
                            className="bg-white hover:bg-slate-50/70 transition-colors cursor-pointer border-t border-slate-200"
                          >
                            <td colSpan={isDraft ? 7 : 6} className="px-3.5 py-2 text-slate-500 hover:text-blue-600">
                              <div className="flex items-center gap-1.5">
                                <Plus className="h-3.5 w-3.5 text-slate-400" />
                                <span>Add another received ingredient...</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50/70 border-t border-slate-200 font-mono text-xs">
                        <tr>
                          <td colSpan={5} className="px-3.5 py-1.5 text-right font-sans font-medium text-slate-500">
                            Subtotal
                          </td>
                          <td className="px-3.5 py-1.5 text-right font-medium text-slate-900">
                            ₹{subtotal.toFixed(2)}
                          </td>
                          {isDraft && <td />}
                        </tr>
                        {taxTotal > 0 && (
                          <tr>
                            <td colSpan={5} className="px-3.5 py-1.5 text-right font-sans font-medium text-slate-500">
                              Estimated Taxes
                            </td>
                            <td className="px-3.5 py-1.5 text-right font-medium text-slate-900">
                              ₹{taxTotal.toFixed(2)}
                            </td>
                            {isDraft && <td />}
                          </tr>
                        )}
                        <tr className="border-t border-slate-200/80 bg-slate-100/50">
                          <td colSpan={5} className="px-3.5 py-2 text-right font-sans font-semibold text-slate-900">
                            Grand Total
                          </td>
                          <td className="px-3.5 py-2 text-right font-bold text-blue-600">
                            ₹{grandTotal.toFixed(2)}
                          </td>
                          {isDraft && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Notes & Delivery Remarks (Jira-style Inline Editable) */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 cursor-pointer hover:bg-slate-100/70 py-1 px-2 rounded transition-colors"
                onClick={() => setIsNotesOpen(!isNotesOpen)}
              >
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform ${
                    isNotesOpen ? "" : "-rotate-90"
                  }`}
                />
                <span>Delivery Remarks & Vehicle Notes</span>
              </button>

              {!isEditingRemarks && isNotesOpen && isDraft && (
                <button
                  type="button"
                  onClick={() => setIsEditingRemarks(true)}
                  className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Edit remarks"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </div>

            {isNotesOpen && (
              <div className="pt-1">
                {isEditingRemarks ? (
                  <div className="rounded-md border border-blue-500 bg-white p-3 shadow-xs space-y-2 animate-in fade-in duration-100">
                    <textarea
                      value={remarksValue}
                      onChange={(e) => setRemarksValue(e.target.value)}
                      placeholder="Add vehicle plate number, delivery condition, quality inspection notes..."
                      rows={3}
                      className="w-full text-xs text-slate-800 placeholder:text-slate-400 outline-none resize-y font-sans"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setRemarksValue(grn.remarks || "");
                          setIsEditingRemarks(false);
                        }}
                        disabled={isPendingRemarks}
                        className="rounded px-2.5 py-1 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveRemarks}
                        disabled={isPendingRemarks}
                        className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {isPendingRemarks ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>Save remarks</span>
                            <CornerDownLeft className="h-3 w-3 opacity-70" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => isDraft && setIsEditingRemarks(true)}
                    className={`p-3 rounded-md border border-slate-200/80 bg-white shadow-2xs ${
                      isDraft ? "hover:bg-slate-50/70 hover:border-slate-300 cursor-pointer group" : ""
                    }`}
                    title={isDraft ? "Click to edit remarks" : undefined}
                  >
                    {grn.remarks ? (
                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {grn.remarks}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic flex items-center gap-1.5 group-hover:text-blue-600">
                        <span>No special delivery remarks recorded.</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Jira-Style Activity & Comments Feed */}
          <CommentSection entityType="GRN" entityId={grn.id} comments={comments || []} />
        </div>

        {/* RIGHT COLUMN: Fully Sticky Sidebar Details (1 Col) */}
        <div className="xl:col-span-1 sticky top-4 self-start max-h-[calc(100vh-3rem)] overflow-y-auto space-y-6 pt-2">
          {/* Action Header */}
          <div className="flex items-center justify-between border-b border-[#DFE1E6] pb-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={grn.status} />
            </div>
          </div>

          {/* Details Panel */}
          <div className="border border-[#DFE1E6] rounded-[3px] bg-white overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-[#FAFBFC] flex items-center gap-2 cursor-pointer hover:bg-[#EBECF0] transition-colors border-b border-[#DFE1E6]">
              <ChevronDown className="h-4 w-4 text-[#5E6C84]" />
              <h3 className="text-[14px] font-semibold text-[#172B4D]">Details</h3>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* Supplier */}
              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Supplier</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#FF8B00] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {supplier?.name?.charAt(0) || "S"}
                    </div>
                    <span className="text-[14px] text-[#172B4D] font-medium truncate">
                      {supplier?.name || "N/A"}
                    </span>
                  </div>
                  {supplier?.gstin && (
                    <span className="font-mono text-[9px] text-slate-400 block mt-0.5">
                      GSTIN: {supplier.gstin}
                    </span>
                  )}
                </div>
              </div>

              {/* Destination Warehouse */}
              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Destination</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#0052CC] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {location?.name?.charAt(0) || "W"}
                    </div>
                    <span className="text-[14px] text-[#172B4D] font-medium truncate">
                      {location?.name || "Warehouse"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchase Order Link */}
              {grn.purchase_order_id && (
                <div className="flex items-start">
                  <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">PO Ref</div>
                  <div className="flex-1">
                    <Link
                      href={`/purchase-orders/${grn.purchase_order_id}`}
                      className="inline-flex items-center gap-1 text-[13px] text-blue-600 hover:underline font-medium"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>View Linked PO</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Invoice # */}
              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Invoice #</div>
                <div className="flex-1">
                  <span className="font-mono text-[13px] text-slate-800">
                    {grn.invoice_number || "None"}
                  </span>
                </div>
              </div>

              {/* Received Date */}
              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Received date</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[14px] text-[#172B4D]">
                    <Calendar className="h-4 w-4 text-[#5E6C84]" />
                    <span>{format(new Date(grn.received_date), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Created date</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[14px] text-[#172B4D]">
                    <Calendar className="h-4 w-4 text-[#5E6C84]" />
                    <span>{format(new Date(grn.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-start pt-2">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Progress</div>
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 w-full bg-[#EBECF0] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isPosted ? "bg-[#00875A]" : grn.status === "CANCELLED" ? "bg-[#DE350B]" : "bg-[#0052CC]"
                      } rounded-full`}
                      style={{ width: isPosted ? "100%" : isDraft ? "50%" : "0%" }}
                    />
                  </div>
                  <div className="text-[12px] text-[#5E6C84]">
                    {isPosted ? "100% received" : isDraft ? "50% drafted" : "0%"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isAddOpen && (
        <GrnItemForm
          grnId={grn.id}
          ingredients={ingredients}
          conversions={conversions}
          units={units}
          taxCategories={taxCategories}
          editItem={editItem || undefined}
          onClose={() => setIsAddOpen(false)}
        />
      )}

      {/* Post Confirmation Modal */}
      <PostGrnDialog
        grn={grn}
        itemCount={items.length}
        open={isPostOpen}
        onOpenChange={setIsPostOpen}
      />
    </div>
  );
}
