"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, ArrowLeft, Trash2, Edit2, Send, CheckCircle, XCircle } from "lucide-react";

import {
  changePurchaseOrderStatus,
  deletePurchaseOrderItem,
} from "@/modules/purchasing/services/purchase-order.actions";
import { PurchaseOrderForm } from "./purchase-order-form";
import { PurchaseOrderItemForm } from "./purchase-order-item-form";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
    APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
    SENT: "bg-purple-50 text-purple-700 border-purple-200",
    PARTIAL: "bg-orange-50 text-orange-700 border-orange-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        styles[status] || styles.DRAFT
      }`}
    >
      {status}
    </span>
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
}: {
  po: any;
  items: any[];
  suppliers: any[];
  locations: any[];
  ingredients: any[];
  units: any[];
  taxCategories: any[];
  ingredientConversions: { ingredient_id: string; from_unit_id: string }[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  const supplier = suppliers.find((s) => s.id === po.supplier_id);
  const location = locations.find((l) => l.id === po.location_id);
  const isDraft = po.status === "DRAFT";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-zinc-100 hover:text-zinc-900 h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {po.po_number}
            </h1>
            <StatusBadge status={po.status} />
          </div>
          <p className="text-sm text-zinc-500">
            Created on {format(new Date(po.created_at), "MMM d, yyyy")}
          </p>
        </div>
        
        {isDraft && (
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditing(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 h-9 px-4 py-2">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Details
            </button>
            <form action={(fd) => { changePurchaseOrderStatus(fd); }}>
              <input type="hidden" name="id" value={po.id} />
              <input type="hidden" name="status" value="APPROVED" />
              <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2">
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve PO
              </button>
            </form>
            <form action={(fd) => { changePurchaseOrderStatus(fd); }}>
              <input type="hidden" name="id" value={po.id} />
              <input type="hidden" name="status" value="CANCELLED" />
              <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700 h-9 px-4 py-2">
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </button>
            </form>
          </div>
        )}
        {po.status === "APPROVED" && (
          <div className="flex items-center gap-2">
            <form action={(fd) => { changePurchaseOrderStatus(fd); }}>
              <input type="hidden" name="id" value={po.id} />
              <input type="hidden" name="status" value="SENT" />
              <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 h-9 px-4 py-2">
                <Send className="mr-2 h-4 w-4" />
                Mark as Sent
              </button>
            </form>
            <form action={(fd) => { changePurchaseOrderStatus(fd); }}>
              <input type="hidden" name="id" value={po.id} />
              <input type="hidden" name="status" value="CANCELLED" />
              <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700 h-9 px-4 py-2">
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Supplier</h3>
          <p className="mt-1 text-base font-medium text-zinc-900">{supplier?.name}</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Destination Warehouse</h3>
          <p className="mt-1 text-base font-medium text-zinc-900">{location?.name}</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Expected Delivery</h3>
          <p className="mt-1 text-base font-medium text-zinc-900">
            {po.expected_delivery_date
              ? format(new Date(po.expected_delivery_date), "MMM d, yyyy")
              : "Not set"}
          </p>
        </div>
      </div>
      
      {po.notes && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Notes</h3>
          <p className="mt-1 text-sm text-zinc-900 whitespace-pre-wrap">{po.notes}</p>
        </div>
      )}

      {/* Line Items */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-medium text-zinc-900">Line Items</h2>
          {isDraft && (
            <button onClick={() => setIsAddingItem(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-sky-600 text-zinc-50 shadow hover:bg-sky-600/90 h-8 px-3">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </button>
          )}
        </div>
        
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-zinc-500">No items added yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-500 border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">Ingredient</th>
                  <th className="px-6 py-3 font-medium text-right">Quantity</th>
                  <th className="px-6 py-3 font-medium">Unit</th>
                  <th className="px-6 py-3 font-medium text-right">Expected Cost</th>
                  <th className="px-6 py-3 font-medium text-right">Line Total</th>
                  {isDraft && <th className="px-6 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => {
                  const ingredient = ingredients.find((i) => i.id === item.ingredient_id);
                  const unit = units.find((u) => u.id === item.unit_id);
                  const lineTotal = item.quantity * item.expected_cost;
                  
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/50">
                      <td className="px-6 py-4 text-zinc-900">{ingredient?.name}</td>
                      <td className="px-6 py-4 text-right font-medium text-zinc-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{unit?.abbreviation}</td>
                      <td className="px-6 py-4 text-right text-zinc-900">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(item.expected_cost)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-zinc-900">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(lineTotal)}
                      </td>
                      {isDraft && (
                        <td className="px-6 py-4 text-right">
                          <form action={(fd) => { deletePurchaseOrderItem(fd); }}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="poId" value={po.id} />
                            <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-red-50 hover:text-red-700 text-red-500 h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-zinc-50 border-t font-semibold text-zinc-900">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right">Total Expected Cost</td>
                  <td className="px-6 py-4 text-right">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                    }).format(po.total_expected_cost)}
                  </td>
                  {isDraft && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[600px] rounded-xl bg-white p-6 shadow-xl relative">
            <button onClick={() => setIsEditing(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-900">
              <XCircle className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold mb-6">Edit Purchase Order</h2>
            <PurchaseOrderForm 
              suppliers={suppliers} 
              locations={locations} 
              po={po} 
            />
          </div>
        </div>
      )}

      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[500px] rounded-xl bg-white p-6 shadow-xl relative">
            <button onClick={() => setIsAddingItem(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-900">
              <XCircle className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold mb-6">Add Item to Purchase Order</h2>
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

