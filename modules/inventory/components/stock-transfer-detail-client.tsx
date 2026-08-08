"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, ArrowLeft, Trash2, Edit2, Send, CheckCircle, XCircle } from "lucide-react";

import {
  changeStockTransferStatus,
  deleteStockTransferItem,
  receiveStockTransfer,
} from "@/modules/inventory/services/stock-transfer.actions";
import { StockTransferForm } from "./stock-transfer-form";
import { StockTransferItemForm } from "./stock-transfer-item-form";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
    SHIPPED: "bg-blue-50 text-blue-700 border-blue-200",
    RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
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

export function StockTransferDetailClient({
  transfer,
  items,
  locations,
  ingredients,
  units,
  activeBranchId,
}: {
  transfer: any;
  items: any[];
  locations: any[];
  ingredients: any[];
  units: any[];
  activeBranchId?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  const sourceLocation = locations.find((l) => l.id === transfer.source_location_id);
  const destinationLocation = locations.find((l) => l.id === transfer.destination_location_id);
  const isDraft = transfer.status === "DRAFT";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/stock-transfers" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-zinc-100 hover:text-zinc-900 h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {transfer.transfer_number}
            </h1>
            <StatusBadge status={transfer.status} />
          </div>
          <p className="text-sm text-zinc-500">
            Created on {format(new Date(transfer.created_at), "MMM d, yyyy")}
          </p>
        </div>
        
        {isDraft && activeBranchId === transfer.source_location_id && (
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditing(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 h-9 px-4 py-2">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Details
            </button>
            <form action={(fd) => { changeStockTransferStatus(fd); }}>
              <input type="hidden" name="id" value={transfer.id} />
              <input type="hidden" name="status" value="SHIPPED" />
              <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2">
                <Send className="mr-2 h-4 w-4" />
                Ship Transfer
              </button>
            </form>
            <form action={(fd) => { changeStockTransferStatus(fd); }}>
              <input type="hidden" name="id" value={transfer.id} />
              <input type="hidden" name="status" value="CANCELLED" />
              <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700 h-9 px-4 py-2">
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </button>
            </form>
          </div>
        )}
        {transfer.status === "SHIPPED" && activeBranchId === transfer.destination_location_id && (
          <div className="flex items-center gap-2">
            <form action={(fd) => { receiveStockTransfer(fd); }}>
              <input type="hidden" name="id" value={transfer.id} />
              <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700 h-9 px-4 py-2">
                <CheckCircle className="mr-2 h-4 w-4" />
                Receive Transfer
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Source Location</h3>
          <p className="mt-1 text-base font-medium text-zinc-900">{sourceLocation?.name}</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Destination Location</h3>
          <p className="mt-1 text-base font-medium text-zinc-900">{destinationLocation?.name}</p>
        </div>
      </div>
      
      {transfer.notes && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Notes</h3>
          <p className="mt-1 text-sm text-zinc-900 whitespace-pre-wrap">{transfer.notes}</p>
        </div>
      )}

      {/* Line Items */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-medium text-zinc-900">Items</h2>
          {isDraft && activeBranchId === transfer.source_location_id && (
            <button onClick={() => setIsAddingItem(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-[#587333] text-zinc-50 hover:bg-[#587333]/90 h-8 px-3">
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
                  {isDraft && <th className="px-6 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => {
                  const ingredient = ingredients.find((i) => i.id === item.ingredient_id);
                  const unit = units.find((u) => u.id === item.unit_id);
                  
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/50">
                      <td className="px-6 py-4 font-medium text-zinc-900">{ingredient?.name}</td>
                      <td className="px-6 py-4 text-right text-zinc-600">{item.quantity}</td>
                      <td className="px-6 py-4 text-zinc-500">{unit?.abbreviation || unit?.name}</td>
                      {isDraft && (
                        <td className="px-6 py-4 text-right">
                          {activeBranchId === transfer.source_location_id && (
                            <form action={(fd) => { deleteStockTransferItem(fd); }}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="transferId" value={transfer.id} />
                              <button type="submit" className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
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
            <h2 className="text-xl font-semibold mb-6">Edit Stock Transfer</h2>
            <StockTransferForm 
              locations={locations} 
              transfer={transfer} 
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
            <h2 className="text-xl font-semibold mb-6">Add Item to Transfer</h2>
            <StockTransferItemForm 
              transferId={transfer.id}
              ingredients={ingredients}
              units={units}
              onSuccess={() => setIsAddingItem(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

