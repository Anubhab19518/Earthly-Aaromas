"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Plus,
  CheckSquare,
  Trash2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Layout,
  CornerDownLeft,
  XCircle,
  FileText,
  Calendar,
  Layers,
  Edit2,
  Loader2,
  Building2,
  Truck,
  MapPin,
  Clock,
  DollarSign,
  AlertCircle,
  Package,
} from "lucide-react";
import { CommentSection } from "@/modules/shared/components/comment-section";
import {
  changePurchaseOrderStatus,
  deletePurchaseOrderItem,
  updatePurchaseOrderNotes,
} from "@/modules/purchasing/services/purchase-order.actions";
import { PurchaseOrderForm } from "./purchase-order-form";
import { PurchaseOrderItemForm } from "./purchase-order-item-form";
import { Tooltip } from "@/shared/components/ui/tooltip";

function StatusDropdown({ po }: { po: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const getBadgeStyle = () => {
    switch (po.status) {
      case "APPROVED":
        return "bg-blue-600 text-white hover:bg-blue-700";
      case "SENT":
        return "bg-purple-600 text-white hover:bg-purple-700";
      case "PARTIAL":
        return "bg-amber-500 text-white hover:bg-amber-600";
      case "COMPLETED":
        return "bg-emerald-600 text-white hover:bg-emerald-700";
      case "CANCELLED":
        return "bg-rose-600 text-white hover:bg-rose-700";
      case "DRAFT":
      default:
        return "bg-slate-200 text-slate-700 hover:bg-slate-300";
    }
  };

  const getBadgeLabel = () => (po.status === "DRAFT" ? "TO DO" : po.status);

  const validTransitions = () => {
    if (po.status === "DRAFT") return ["APPROVED", "CANCELLED"];
    if (po.status === "APPROVED") return ["SENT", "CANCELLED"];
    return [];
  };

  const transitions = validTransitions();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => transitions.length > 0 && setIsOpen(!isOpen)}
        disabled={isPending || transitions.length === 0}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-2xs ${getBadgeStyle()}`}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <span>{getBadgeLabel()}</span>
            {transitions.length > 0 && <ChevronDown className="h-3 w-3 opacity-80" />}
          </>
        )}
      </button>

      {isOpen && transitions.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg z-50 py-1 animate-in fade-in duration-100 text-xs">
            <div className="px-3 py-1 text-[10px] font-medium text-slate-400 select-none">
              Transition status to:
            </div>
            {transitions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    const fd = new FormData();
                    fd.append("id", po.id);
                    fd.append("status", status);
                    await changePurchaseOrderStatus(fd);
                    setIsOpen(false);
                  });
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50 transition-colors capitalize font-medium flex items-center justify-between"
              >
                <span>{status.toLowerCase()}</span>
                <span className="text-[10px] text-slate-400 font-mono">→</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PurchaseOrderDetailClient({
  po,
  items,
  suppliers,
  locations,
  ingredients,
  units,
  taxCategories,
  ingredientConversions,
  comments,
}: {
  po: any;
  items: any[];
  suppliers: any[];
  locations: any[];
  ingredients: any[];
  units: any[];
  taxCategories: any[];
  ingredientConversions: { ingredient_id: string; from_unit_id: string }[];
  comments?: any[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [isItemsOpen, setIsItemsOpen] = useState(true);

  // Interactive Notes State
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(po.notes || "");
  const [isPendingNotes, startNotesTransition] = useTransition();

  const supplier = suppliers.find((s) => s.id === po.supplier_id);
  const location = locations.find((l) => l.id === po.location_id);
  const isDraft = po.status === "DRAFT";

  const progressPercent =
    po.status === "COMPLETED"
      ? "100%"
      : po.status === "PARTIAL"
      ? "75%"
      : po.status === "SENT"
      ? "50%"
      : po.status === "APPROVED"
      ? "25%"
      : po.status === "CANCELLED"
      ? "0%"
      : "10%";

  const progressColor =
    po.status === "COMPLETED"
      ? "bg-emerald-600"
      : po.status === "CANCELLED"
      ? "bg-rose-600"
      : "bg-blue-600";

  let subtotal = 0;
  let taxTotal = 0;

  items.forEach((item) => {
    const baseLine = item.quantity * item.expected_cost;
    subtotal += baseLine;
    if (item.tax_category_id) {
      const tc = taxCategories.find((t) => t.id === item.tax_category_id);
      const rate = tc?.tax_rates?.[0]?.rate_percentage || 0;
      taxTotal += baseLine * (rate / 100);
    }
  });

  const grandTotal = subtotal + taxTotal;

  // Save Notes Handler
  const handleSaveNotes = () => {
    startNotesTransition(async () => {
      const result = await updatePurchaseOrderNotes(po.id, notesValue);
      if (!result?.message) {
        setIsEditingNotes(false);
      }
    });
  };

  return (
    <div className="max-w-[1500px] mx-auto py-2 bg-transparent min-h-screen text-xs space-y-4">
      {/* 1. Jira-Style Breadcrumbs Bar */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link href="/purchase-orders" className="hover:text-blue-600 hover:underline flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-blue-600" />
          <span>Purchase Orders</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <div className="flex items-center gap-1 text-slate-900 font-semibold">
          <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
          <span>{po.po_number}</span>
        </div>
      </div>

      {/* 2. Main 2-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* LEFT COLUMN: Main Issue / PO Work Area (2 Cols) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Header Title & Quick Create */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {po.po_number}
              </h1>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {po.status}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/purchase-orders/new"
                className="flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-2.5 py-1 text-xs font-medium transition-colors shadow-2xs"
                title="Create New Purchase Order"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New PO</span>
              </Link>
            </div>
          </div>

          {/* Section 1: Line Items Table (Subtasks in Jira) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 cursor-pointer hover:bg-slate-100/70 py-1 px-2 rounded transition-colors"
                onClick={() => setIsItemsOpen(!isItemsOpen)}
              >
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isItemsOpen ? "" : "-rotate-90"}`} />
                <span>Ordered Items</span>
                <span className="flex h-4 px-1.5 items-center justify-center rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200/60 ml-1">
                  {items.length}
                </span>
              </button>

              <div className="flex items-center gap-1">
                {isDraft && (
                  <button
                    type="button"
                    onClick={() => setIsAddingItem(true)}
                    className="flex items-center gap-1 rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-200/60 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add item</span>
                  </button>
                )}
              </div>
            </div>

            {isItemsOpen && (
              <div className="space-y-2">
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${progressColor} rounded-full transition-all duration-500`} style={{ width: progressPercent }} />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">{progressPercent} Fulfilled</span>
                </div>

                {items.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 border border-slate-200 rounded-md bg-white">
                    <Package className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-slate-600">No items added to this PO yet</p>
                    {isDraft && (
                      <button
                        type="button"
                        onClick={() => setIsAddingItem(true)}
                        className="mt-1.5 text-blue-600 hover:underline text-xs font-medium cursor-pointer"
                      >
                        + Click to add your first item
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500 select-none">
                          <th className="px-3.5 py-2">Ingredient</th>
                          <th className="px-3.5 py-2 w-[15%]">Quantity</th>
                          <th className="px-3.5 py-2 w-[15%]">Unit</th>
                          <th className="px-3.5 py-2 w-[16%] text-right">Unit cost</th>
                          <th className="px-3.5 py-2 w-[18%] text-right">Line total</th>
                          {isDraft && <th className="px-3 py-2 text-right w-[6%]"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 text-xs text-slate-800">
                        {items.map((item) => {
                          const ingredient = ingredients.find((i) => i.id === item.ingredient_id);
                          const unit = units.find((u) => u.id === item.unit_id);
                          const lineTotal = item.quantity * item.expected_cost;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                              <td className="px-3.5 py-2.5 font-medium text-slate-900">
                                <div className="flex items-center gap-2">
                                  <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                                  <span>{ingredient?.name || "Unknown"}</span>
                                  {ingredient?.sku && (
                                    <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                      {ingredient.sku}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 font-mono font-medium text-slate-900">{item.quantity}</td>
                              <td className="px-3.5 py-2.5 font-mono text-slate-600">{unit?.symbol || unit?.name}</td>
                              <td className="px-3.5 py-2.5 text-slate-700 text-right font-mono">
                                ₹{Number(item.expected_cost).toFixed(2)}
                              </td>
                              <td className="px-3.5 py-2.5 text-blue-600 text-right font-mono font-medium">
                                ₹{lineTotal.toFixed(2)}
                              </td>
                              {isDraft && (
                                <td className="px-3 py-2.5 text-right">
                                  <form action={(fd) => { deletePurchaseOrderItem(fd); }}>
                                    <input type="hidden" name="id" value={item.id} />
                                    <input type="hidden" name="poId" value={po.id} />
                                    <button
                                      type="submit"
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Remove item"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </form>
                                </td>
                              )}
                            </tr>
                          );
                        })}

                        {/* Quick Trigger Row in Draft Mode */}
                        {isDraft && (
                          <tr
                            onClick={() => setIsAddingItem(true)}
                            className="bg-white hover:bg-slate-50/70 transition-colors cursor-pointer border-t border-slate-200"
                          >
                            <td colSpan={isDraft ? 6 : 5} className="px-3.5 py-2 text-slate-500 hover:text-blue-600">
                              <div className="flex items-center gap-1.5">
                                <Plus className="h-3.5 w-3.5 text-slate-400" />
                                <span>Add another item to order...</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50/70 border-t border-slate-200 font-mono text-xs">
                        <tr>
                          <td colSpan={4} className="px-3.5 py-1.5 text-right font-sans font-medium text-slate-500">Subtotal</td>
                          <td className="px-3.5 py-1.5 text-right font-medium text-slate-900">
                            ₹{subtotal.toFixed(2)}
                          </td>
                          {isDraft && <td />}
                        </tr>
                        {taxTotal > 0 && (
                          <tr>
                            <td colSpan={4} className="px-3.5 py-1.5 text-right font-sans font-medium text-slate-500">Taxes</td>
                            <td className="px-3.5 py-1.5 text-right font-medium text-slate-900">
                              ₹{taxTotal.toFixed(2)}
                            </td>
                            {isDraft && <td />}
                          </tr>
                        )}
                        <tr className="border-t border-slate-200/80 bg-slate-100/50">
                          <td colSpan={4} className="px-3.5 py-2 text-right font-sans font-semibold text-slate-900">Grand Total</td>
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

          {/* Section 2: Notes / Instructions (Jira-style Inline Editable) */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 cursor-pointer hover:bg-slate-100/70 py-1 px-2 rounded transition-colors"
                onClick={() => setIsNotesOpen(!isNotesOpen)}
              >
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isNotesOpen ? "" : "-rotate-90"}`} />
                <span>Notes & Instructions</span>
              </button>

              {!isEditingNotes && isNotesOpen && (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Edit notes"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </div>

            {isNotesOpen && (
              <div className="pt-1">
                {isEditingNotes ? (
                  <div className="rounded-md border border-blue-500 bg-white p-3 shadow-xs space-y-2 animate-in fade-in duration-100">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add delivery instructions, payment terms, or special packaging notes..."
                      rows={3}
                      className="w-full text-xs text-slate-800 placeholder:text-slate-400 outline-none resize-y font-sans"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setNotesValue(po.notes || "");
                          setIsEditingNotes(false);
                        }}
                        disabled={isPendingNotes}
                        className="rounded px-2.5 py-1 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={isPendingNotes}
                        className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {isPendingNotes ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>Save notes</span>
                            <CornerDownLeft className="h-3 w-3 opacity-70" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingNotes(true)}
                    className="p-3 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50/70 hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
                    title="Click to edit notes"
                  >
                    {po.notes ? (
                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {po.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic flex items-center gap-1.5 group-hover:text-blue-600">
                        <span>Add notes, delivery instructions, or supplier terms...</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Jira-Style Comments & Activity Section */}
          <CommentSection entityType="PO" entityId={po.id} comments={comments || []} />
        </div>

        {/* RIGHT COLUMN: Fully Sticky Sidebar Details */}
        <div className="xl:col-span-1 sticky top-4 self-start max-h-[calc(100vh-3rem)] overflow-y-auto space-y-6 pt-2">
          {/* Action Header */}
          <div className="flex items-center justify-between border-b border-[#DFE1E6] pb-4">
            <div className="flex items-center gap-2">
              <StatusDropdown po={po} />
            </div>
          </div>

          {/* Details Panel */}
          <div className="border border-[#DFE1E6] rounded-[3px] bg-white overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-[#FAFBFC] flex items-center gap-2 cursor-pointer hover:bg-[#EBECF0] transition-colors border-b border-[#DFE1E6]">
              <ChevronDown className="h-4 w-4 text-[#5E6C84]" />
              <h3 className="text-[14px] font-semibold text-[#172B4D]">Details</h3>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Supplier</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#FF8B00] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {supplier?.name?.charAt(0) || "S"}
                    </div>
                    <span className="text-[14px] text-[#172B4D] font-medium truncate">{supplier?.name || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Destination</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#0052CC] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {location?.name?.charAt(0) || "L"}
                    </div>
                    <span className="text-[14px] text-[#172B4D] font-medium truncate">{location?.name || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Expected date</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[14px] text-[#172B4D]">
                    <Calendar className="h-4 w-4 text-[#5E6C84]" />
                    <span>{po.expected_delivery_date ? format(new Date(po.expected_delivery_date), "MMM d, yyyy") : "Not set"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Created date</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[14px] text-[#172B4D]">
                    <Calendar className="h-4 w-4 text-[#5E6C84]" />
                    <span>{format(new Date(po.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start pt-2">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Progress</div>
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 w-full bg-[#EBECF0] rounded-full overflow-hidden">
                    <div className={`h-full ${progressColor} rounded-full`} style={{ width: progressPercent }} />
                  </div>
                  <div className="text-[12px] text-[#5E6C84]">{progressPercent} done</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Header Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-[600px] rounded-lg bg-white p-5 shadow-xl relative border border-slate-200">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <XCircle className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold mb-4 text-slate-900">Edit Purchase Order Details</h2>
            <PurchaseOrderForm
              suppliers={suppliers}
              locations={locations}
              po={po}
            />
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-[500px] rounded-lg bg-white p-5 shadow-xl relative border border-slate-200">
            <button
              onClick={() => setIsAddingItem(false)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <XCircle className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold mb-4 text-slate-900">Add Line Item</h2>
            <PurchaseOrderItemForm
              poId={po.id}
              ingredients={ingredients}
              units={units}
              taxCategories={taxCategories}
              ingredientConversions={ingredientConversions}
              onSuccess={() => setIsAddingItem(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
