"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ClipboardList,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Truck,
  MapPin,
  Calendar,
  Check,
  Sparkles,
} from "lucide-react";
import { createGrn } from "@/modules/receiving/services/grn.actions";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface CreateGrnDialogProps {
  suppliers: Supplier[];
  warehouseLocations: Location[];
  purchaseOrders: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGrnDialog({
  suppliers,
  warehouseLocations,
  purchaseOrders,
  open,
  onOpenChange,
}: CreateGrnDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [purchaseOrderId, setPurchaseOrderId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [warehouseLocationId, setWarehouseLocationId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState<string>("");

  // When PO changes, autofill Supplier and Warehouse
  useEffect(() => {
    if (purchaseOrderId) {
      const po = purchaseOrders.find((p) => p.id === purchaseOrderId);
      if (po) {
        if (po.supplier_id) setSupplierId(po.supplier_id);
        if (po.location_id) setWarehouseLocationId(po.location_id);
      }
    }
  }, [purchaseOrderId, purchaseOrders]);

  useEffect(() => {
    if (open) {
      setPurchaseOrderId("");
      setSupplierId(suppliers[0]?.id || "");
      setWarehouseLocationId(warehouseLocations[0]?.id || "");
      setInvoiceNumber("");
      setInvoiceDate("");
      setReceivedDate(new Date().toISOString().split("T")[0]);
      setRemarks("");
      setErrorMsg(null);
    }
  }, [open, suppliers, warehouseLocations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setErrorMsg("Please select a supplier.");
      return;
    }
    if (!warehouseLocationId) {
      setErrorMsg("Please select a receiving warehouse location.");
      return;
    }
    if (!receivedDate) {
      setErrorMsg("Please select the received date.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const fd = new FormData();
      fd.append("supplier_id", supplierId);
      fd.append("warehouse_location_id", warehouseLocationId);
      if (purchaseOrderId) fd.append("purchase_order_id", purchaseOrderId);
      if (invoiceNumber.trim()) fd.append("invoice_number", invoiceNumber.trim());
      if (invoiceDate) fd.append("invoice_date", invoiceDate);
      fd.append("received_date", receivedDate);
      if (remarks.trim()) fd.append("remarks", remarks.trim());

      const result = await createGrn(null, fd);
      if (result?.message) {
        setErrorMsg(result.message);
      }
      // On success, createGrn will redirect to /receiving/[id]
    });
  };

  if (!open) return null;

  const selectedPo = purchaseOrders.find((p) => p.id === purchaseOrderId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-100 font-sans">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl relative border border-slate-200 text-xs">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Dialog Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200/60">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 leading-tight">
              Create Goods Receipt (GRN)
            </h2>
            <p className="text-[11px] text-slate-500">
              Record physical stock delivery from supplier to warehouse
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Link Purchase Order (Smart Autofill) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Link Approved Purchase Order (Recommended)
            </label>
            <Select
              value={purchaseOrderId}
              onValueChange={(val) => setPurchaseOrderId(val)}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200 font-sans">
                <SelectValue placeholder="No Purchase Order (Manual Receipt)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">
                  No Purchase Order (Manual Receipt)
                </SelectItem>
                {purchaseOrders.map((po) => (
                  <SelectItem key={po.id} value={po.id} className="text-xs font-medium">
                    {po.po_number} ({po.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPo && (
              <div className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50/60 px-2 py-1 rounded border border-blue-200/40 mt-1">
                <Sparkles className="h-3 w-3" />
                <span>Line items will be automatically copied from {selectedPo.po_number}</span>
              </div>
            )}
          </div>

          {/* 2. Supplier & Warehouse */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Supplier <span className="text-rose-500">*</span>
              </label>
              <Select value={supplierId} onValueChange={(val) => setSupplierId(val)}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Receiving Warehouse <span className="text-rose-500">*</span>
              </label>
              <Select
                value={warehouseLocationId}
                onValueChange={(val) => setWarehouseLocationId(val)}
              >
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Select warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouseLocations.map((w) => (
                    <SelectItem key={w.id} value={w.id} className="text-xs">
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. Invoice Number & Invoice Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Supplier Invoice / DC #
              </label>
              <Input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2026-0881"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Invoice Date
              </label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-8 text-xs font-sans"
              />
            </div>
          </div>

          {/* 4. Received Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Goods Received Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="h-8 text-xs font-sans"
              required
            />
          </div>

          {/* 5. Remarks / Delivery Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Delivery Remarks / Vehicle # (Optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Vehicle plate number, seal status, delivery condition..."
              className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none font-sans"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !supplierId || !warehouseLocationId}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <span>Create Receipt</span>
                  <Check className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
