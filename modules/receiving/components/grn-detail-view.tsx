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
  Check,
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
  poItems?: any[];
  postedPoReceipts?: any[];
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
  poItems = [],
  postedPoReceipts = [],
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
  const hasLinkedPo = Boolean(grn.purchase_order_id && poItems.length > 0);

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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Main Receipt Work Area (8 of 12 cols) */}
        <div className="xl:col-span-8 space-y-5">
          {/* Header Title & Top Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight font-mono">
                {grn.grn_number}
              </h1>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {grn.status}
              </span>
              {grn.purchase_order_id && (
                <span className="text-[10px] text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                  PO Linked
                </span>
              )}
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-2.5 py-1 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
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
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Cancel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPostOpen(true)}
                    disabled={items.length === 0}
                    className="flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
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
                  <div className="rounded-md border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500 select-none">
                          <th className="px-3.5 py-2">Ingredient</th>
                          <th className="px-3 py-2 w-[100px]">Source</th>
                          {hasLinkedPo && (
                            <th className="px-3 py-2 font-mono text-center w-[90px]">Ordered</th>
                          )}
                          <th className="px-3 py-2 font-mono text-center w-[90px]">Received</th>
                          {hasLinkedPo && (
                            <th className="px-3 py-2 w-[110px]">PO Balance</th>
                          )}
                          <th className="px-3 py-2 font-mono w-[110px]">Stock Converted</th>
                          <th className="px-3 py-2 text-right w-[100px]">Unit Cost</th>
                          <th className="px-3.5 py-2 text-right w-[100px]">Total</th>
                          {isDraft && <th className="px-2 py-2 text-right w-[32px]"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 text-xs text-slate-800">
                        {items.map((item) => {
                          const ing = getIngredient(item.ingredient_id);
                          const purchaseUnit = getUnit(item.purchase_unit_id);
                          const baseUnit = ing ? getUnit(ing.base_unit_id) : null;
                          const lineTotal = Number(item.line_total);

                          // Fulfillment calculation for PO-linked items
                          const poi = item.purchase_order_item_id
                            ? poItems.find((p) => p.id === item.purchase_order_item_id)
                            : grn.purchase_order_id
                            ? poItems.find((p) => p.ingredient_id === item.ingredient_id)
                            : null;
                          const isFromPo = Boolean(poi);

                          const orderedQty = poi ? Number(poi.quantity) : null;
                          const otherPostedQty = poi
                            ? postedPoReceipts
                                .filter(
                                  (r) =>
                                    r.goods_receipt_id !== grn.id &&
                                    (r.purchase_order_item_id === poi.id ||
                                      (!r.purchase_order_item_id && r.ingredient_id === item.ingredient_id))
                                )
                                .reduce((acc, r) => acc + Number(r.received_quantity), 0)
                            : 0;

                          const cumulativeQty = otherPostedQty + Number(item.received_quantity);
                          const diff = orderedQty !== null ? orderedQty - cumulativeQty : null;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                              {/* Ingredient */}
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

                              {/* Source Badge */}
                              <td className="px-3 py-2.5">
                                {isFromPo ? (
                                  <span className="inline-block text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    From PO
                                  </span>
                                ) : (
                                  <span className="inline-block text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    Unplanned
                                  </span>
                                )}
                              </td>

                              {/* PO Ordered Qty (if PO linked) */}
                              {hasLinkedPo && (
                                <td className="px-3 py-2.5 font-mono text-slate-700 text-center">
                                  {orderedQty !== null ? (
                                    <span>{orderedQty} {purchaseUnit?.symbol || ""}</span>
                                  ) : (
                                    <span className="text-slate-400 font-sans italic">—</span>
                                  )}
                                </td>
                              )}

                              {/* Received Qty */}
                              <td className="px-3 py-2.5 font-mono font-medium text-slate-900 text-center">
                                {item.received_quantity} {purchaseUnit?.symbol || ""}
                              </td>

                              {/* PO Balance (if PO linked) */}
                              {hasLinkedPo && (
                                <td className="px-3 py-2.5">
                                  {diff !== null ? (
                                    diff > 0 ? (
                                      <span className="inline-block text-[10px] font-mono font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                                        {diff % 1 === 0 ? diff : diff.toFixed(1)} {purchaseUnit?.symbol || ""} left
                                      </span>
                                    ) : diff === 0 ? (
                                      <span className="inline-block text-[10px] font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                                        Fulfilled
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[10px] font-mono font-medium text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                                        +{Math.abs(diff % 1 === 0 ? diff : Number(diff.toFixed(1)))} {purchaseUnit?.symbol || ""} Over
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 text-[10px] font-sans italic">
                                      Extra item
                                    </span>
                                  )}
                                </td>
                              )}

                              {/* Stock Converted */}
                              <td className="px-3 py-2.5 font-mono text-blue-700 bg-blue-50/40">
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <Scale className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span>
                                    {Number(item.converted_base_quantity).toFixed(1)}{" "}
                                    {baseUnit?.symbol || ""}
                                  </span>
                                </span>
                              </td>

                              {/* Unit Cost */}
                              <td className="px-3 py-2.5 text-slate-700 text-right font-mono">
                                ₹{Number(item.unit_cost).toFixed(2)}
                                {(purchaseUnit?.symbol || purchaseUnit?.name) && (
                                  <span className="text-[9px] text-slate-400 font-sans ml-0.5">/{purchaseUnit?.symbol || purchaseUnit?.name}</span>
                                )}
                              </td>

                              {/* Line Total */}
                              <td className="px-3.5 py-2.5 text-blue-600 text-right font-mono font-medium">
                                ₹{lineTotal.toFixed(2)}
                              </td>

                              {/* Actions */}
                              {isDraft && (
                                <td className="px-2 py-2.5 text-right">
                                  <div className="flex items-center justify-end">
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
                            <td colSpan={hasLinkedPo ? (isDraft ? 9 : 8) : (isDraft ? 7 : 6)} className="px-3.5 py-2 text-slate-500 hover:text-blue-600">
                              <div className="flex items-center gap-1.5">
                                <Plus className="h-3.5 w-3.5 text-slate-400" />
                                <span>Add extra / unplanned ingredient...</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50/70 border-t border-slate-200 font-mono text-xs">
                        <tr>
                          <td colSpan={hasLinkedPo ? 7 : 5} className="px-3.5 py-1.5 text-right font-sans font-medium text-slate-500">
                            Subtotal
                          </td>
                          <td className="px-3.5 py-1.5 text-right font-medium text-slate-900">
                            ₹{subtotal.toFixed(2)}
                          </td>
                          {isDraft && <td />}
                        </tr>
                        {taxTotal > 0 && (
                          <tr>
                            <td colSpan={hasLinkedPo ? 7 : 5} className="px-3.5 py-1.5 text-right font-sans font-medium text-slate-500">
                              Taxes
                            </td>
                            <td className="px-3.5 py-1.5 text-right font-medium text-slate-900">
                              ₹{taxTotal.toFixed(2)}
                            </td>
                            {isDraft && <td />}
                          </tr>
                        )}
                        <tr className="border-t border-slate-200/80 bg-slate-100/50 font-bold">
                          <td colSpan={hasLinkedPo ? 7 : 5} className="px-3.5 py-2 text-right font-sans text-slate-900">
                            Grand Total
                          </td>
                          <td className="px-3.5 py-2 text-right text-blue-600">
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

          {/* Section 2: Remarks / Delivery Notes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 cursor-pointer hover:bg-slate-100/70 py-1 px-2 rounded transition-colors"
                onClick={() => setIsNotesOpen(!isNotesOpen)}
              >
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isNotesOpen ? "" : "-rotate-90"}`} />
                <span>Delivery Remarks & Vehicle Notes</span>
              </button>
            </div>

            {isNotesOpen && (
              <div className="rounded-md border border-slate-200 bg-white p-3.5 shadow-2xs">
                {isDraft && isEditingRemarks ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={remarksValue}
                      onChange={(e) => setRemarksValue(e.target.value)}
                      placeholder="Add vehicle plate number, seal details, delivery notes..."
                      className="w-full rounded border border-blue-500 bg-white p-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500/20 font-sans"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveRemarks}
                        disabled={isPendingRemarks}
                        className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {isPendingRemarks ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Save notes</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRemarksValue(grn.remarks || "");
                          setIsEditingRemarks(false);
                        }}
                        disabled={isPendingRemarks}
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      if (isDraft) setIsEditingRemarks(true);
                    }}
                    className={`rounded p-2 -m-2 transition-colors group ${
                      isDraft ? "cursor-pointer hover:bg-slate-50/80" : ""
                    }`}
                    title={isDraft ? "Click to edit remarks" : undefined}
                  >
                    {grn.remarks ? (
                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {grn.remarks}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No delivery remarks recorded.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Jira-Style Activity & Comments Feed */}
          <CommentSection entityType="GRN" entityId={grn.id} comments={comments || []} />
        </div>

        {/* RIGHT COLUMN: Fully Sticky Sidebar Details (4 of 12 cols) */}
        <div className="xl:col-span-4 sticky top-4 self-start max-h-[calc(100vh-3rem)] overflow-y-auto space-y-6 pt-2">
          {/* Details Panel */}
          <div className="border border-[#DFE1E6] rounded-[3px] bg-white overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-[#FAFBFC] flex items-center gap-2 cursor-pointer hover:bg-[#EBECF0] transition-colors border-b border-[#DFE1E6]">
              <ChevronDown className="h-4 w-4 text-[#5E6C84]" />
              <h3 className="text-[14px] font-semibold text-[#172B4D]">Details</h3>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* Supplier */}
              <div className="flex items-start">
                <div className="w-[90px] shrink-0 text-[13px] text-[#5E6C84] mt-0.5">Supplier</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#FF8B00] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {supplier?.name?.charAt(0) || "S"}
                    </div>
                    <span className="text-[13px] text-[#172B4D] font-medium leading-snug break-words">
                      {supplier?.name || "N/A"}
                    </span>
                  </div>
                  {supplier?.gstin && (
                    <span className="font-mono text-[9px] text-slate-400 block mt-0.5 ml-7">
                      GSTIN: {supplier.gstin}
                    </span>
                  )}
                </div>
              </div>

              {/* Destination Facility (Dynamic Warehouse vs Shop) */}
              <div className="flex items-start">
                <div className="w-[90px] shrink-0 text-[13px] text-[#5E6C84] mt-0.5">Destination</div>
                <div className="flex-1 min-w-0">
                  {(() => {
                    const loc = location as any;
                    const typeCode = loc?.location_types?.code || "";
                    const isWarehouse = typeCode === "WAREHOUSE" || typeCode === "CENTRAL_WAREHOUSE";
                    const typeName = loc?.location_types?.name || (isWarehouse ? "Warehouse" : "Shop");
                    const displayName = loc?.name || (isWarehouse ? "Warehouse" : "Shop");

                    return (
                      <div className="flex items-start gap-2">
                        <div className={`h-5 w-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          isWarehouse ? "bg-[#0052CC]" : "bg-emerald-600"
                        }`}>
                          {displayName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[13px] text-[#172B4D] font-medium leading-snug break-words block">
                            {displayName}
                          </span>
                          <span className={`inline-block font-mono text-[9px] px-1 py-0.2 rounded border mt-0.5 ${
                            isWarehouse 
                              ? "text-blue-700 bg-blue-50 border-blue-200/60" 
                              : "text-emerald-700 bg-emerald-50 border-emerald-200/60"
                          }`}>
                            {typeName}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Purchase Order Link */}
              {grn.purchase_order_id && (
                <div className="flex items-start">
                  <div className="w-[90px] shrink-0 text-[13px] text-[#5E6C84] mt-0.5">PO Ref</div>
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
                <div className="w-[90px] shrink-0 text-[13px] text-[#5E6C84] mt-0.5">Invoice #</div>
                <div className="flex-1">
                  <span className="font-mono text-[13px] text-slate-800">
                    {grn.invoice_number || "None"}
                  </span>
                </div>
              </div>

              {/* Received Date */}
              <div className="flex items-start">
                <div className="w-[90px] shrink-0 text-[13px] text-[#5E6C84] mt-0.5">Received Date</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[13px] text-[#172B4D]">
                    <Calendar className="h-4 w-4 text-[#5E6C84]" />
                    <span>{format(new Date(grn.received_date), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-start">
                <div className="w-[90px] shrink-0 text-[13px] text-[#5E6C84] mt-0.5">Created</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[13px] text-[#172B4D]">
                    <Calendar className="h-4 w-4 text-[#5E6C84]" />
                    <span>{format(new Date(grn.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-start pt-2">
                <div className="w-[90px] shrink-0 text-[13px] text-[#5E6C84] mt-0.5">Progress</div>
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
