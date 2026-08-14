"use client";

import { useState, useTransition } from "react";
import { GoodsReceipt, GoodsReceiptItem } from "@/modules/receiving/schemas/grn.schema";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Ingredient } from "@/modules/ingredients/schemas/ingredient.schema";
import { IngredientUnitConversion } from "@/modules/ingredients/schemas/ingredient-conversion.schema";
import { Unit } from "@/modules/units/schemas/unit.schema";
import { TaxCategory } from "@/modules/taxes/schemas/tax.schema";
import { cancelGrn } from "@/modules/receiving/services/grn.actions";
import { GrnItemForm } from "./grn-item-form";
import { PostGrnDialog } from "./post-grn-dialog";
import { CommentSection } from "@/modules/shared/components/comment-section";
import Link from "next/link";

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

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  POSTED: "bg-green-100 text-green-800",
  CANCELLED: "bg-zinc-100 text-zinc-600",
};

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
  const [isCancelling, startCancelTransition] = useTransition();

  const isDraft = grn.status === "DRAFT";

  const getIngredientName = (id: string) => ingredients.find((i) => i.id === id)?.name ?? "-";
  const getUnitName = (id: string) => {
    const u = units.find((u) => u.id === id);
    return u ? `${u.name} (${u.symbol})` : "-";
  };
  const getBaseUnit = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return "-";
    const u = units.find((u) => u.id === ing.base_unit_id);
    return u?.symbol ?? "-";
  };
  const getTaxName = (id: string | null | undefined) =>
    id ? (taxCategories.find((t) => t.id === id)?.name ?? "-") : "-";
  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "-";
  const getLocationName = (id: string) => warehouseLocations.find((l) => l.id === id)?.name ?? "-";

  let subtotal = 0;
  let taxTotal = 0;

  items.forEach((item) => {
    const baseLine = Number(item.line_total);
    subtotal += baseLine;
    if (item.tax_category_id) {
      const tc = taxCategories.find((t) => t.id === item.tax_category_id);
      const rate = tc?.tax_rates?.[0]?.rate_percentage || 0;
      taxTotal += baseLine * (rate / 100);
    }
  });

  const grandTotal = subtotal + taxTotal;

  const handleCancel = () => {
    if (!confirm("Are you sure you want to cancel this GRN? This cannot be undone.")) return;
    startCancelTransition(async () => {
      const formData = new FormData();
      formData.append("id", grn.id);
      await cancelGrn(null, formData);
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="mb-6 flex items-start justify-between print:hidden">
        <div>
          <Link href="/receiving" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Back to Goods Receipts
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 font-mono">{grn.grn_number}</h1>
          <div className="mt-1 flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[grn.status] || ""}`}>
              {grn.status}
            </span>
          </div>
        </div>
        {isDraft && (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel GRN
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Print
            </button>
            <button
              onClick={() => setIsPostOpen(true)}
              disabled={items.length === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Post GRN
            </button>
          </div>
        )}
        {!isDraft && (
          <button
            onClick={() => window.print()}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Print
          </button>
        )}
      </div>

      {/* GRN Header Details */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Receipt Details</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
          <div>
            <p className="text-zinc-500">Supplier</p>
            <p className="font-medium text-zinc-900">{getSupplierName(grn.supplier_id)}</p>
          </div>
          <div>
            <p className="text-zinc-500">Receiving Warehouse</p>
            <p className="font-medium text-zinc-900">{getLocationName(grn.warehouse_location_id)}</p>
          </div>
          <div>
            <p className="text-zinc-500">Received Date</p>
            <p className="font-medium text-zinc-900">{grn.received_date}</p>
          </div>
          <div>
            <p className="text-zinc-500">Invoice #</p>
            <p className="font-medium text-zinc-900">{grn.invoice_number || "—"}</p>
          </div>
          <div>
            <p className="text-zinc-500">Invoice Date</p>
            <p className="font-medium text-zinc-900">{grn.invoice_date || "—"}</p>
          </div>
          {grn.remarks && (
            <div className="col-span-full">
              <p className="text-zinc-500">Remarks</p>
              <p className="font-medium text-zinc-900">{grn.remarks}</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <CommentSection entityType="GRN" entityId={grn.id} comments={comments || []} />

      {/* Items Table */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Items ({items.length})</h2>
          {isDraft && !grn.purchase_order_id && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Add Item
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Ingredient</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Purchase Unit</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Received Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Base Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Unit Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Tax</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Line Total</th>
                {isDraft && <th className="px-4 py-3"><span className="sr-only">Edit</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-500">
                    {grn.purchase_order_id 
                      ? "No items found in this Goods Receipt." 
                      : 'No items yet. Click "Add Item" to begin.'}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      {getIngredientName(item.ingredient_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{getUnitName(item.purchase_unit_id)}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-900">{Number(item.received_quantity)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">
                      {Number(item.converted_base_quantity)} {getBaseUnit(item.ingredient_id)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-900">₹{Number(item.unit_cost).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{getTaxName(item.tax_category_id)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">₹{Number(item.line_total).toFixed(2)}</td>
                    {isDraft && (
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        <button
                          onClick={() => setEditItem(item)}
                          className="text-zinc-600 hover:text-zinc-900"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-zinc-50">
                <tr>
                  <td colSpan={isDraft ? 6 : 6} className="px-4 py-2 text-right text-sm font-medium text-zinc-500">
                    Subtotal
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-zinc-900">
                    ₹{subtotal.toFixed(2)}
                  </td>
                  {isDraft && <td />}
                </tr>
                {taxTotal > 0 && (
                  <tr>
                    <td colSpan={isDraft ? 6 : 6} className="px-4 py-2 text-right text-sm font-medium text-zinc-500">
                      Tax Total
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium text-zinc-900">
                      ₹{taxTotal.toFixed(2)}
                    </td>
                    {isDraft && <td />}
                  </tr>
                )}
                <tr>
                  <td colSpan={isDraft ? 6 : 6} className="px-4 py-3 text-right text-sm font-bold text-zinc-900 border-t border-zinc-200">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-zinc-900 border-t border-zinc-200">
                    ₹{grandTotal.toFixed(2)}
                  </td>
                  {isDraft && <td className="border-t border-zinc-200" />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modals */}
      {isAddOpen && (
        <GrnItemForm
          grnId={grn.id}
          ingredients={ingredients}
          conversions={conversions}
          units={units}
          taxCategories={taxCategories}
          onClose={() => setIsAddOpen(false)}
        />
      )}

      {editItem && (
        <GrnItemForm
          grnId={grn.id}
          ingredients={ingredients}
          conversions={conversions}
          units={units}
          taxCategories={taxCategories}
          editItem={editItem}
          onClose={() => setEditItem(null)}
        />
      )}

      <PostGrnDialog
        grn={grn}
        itemCount={items.length}
        open={isPostOpen}
        onOpenChange={setIsPostOpen}
      />
    </div>
  );
}

