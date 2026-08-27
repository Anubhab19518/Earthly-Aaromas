"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
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
  Store,
  Warehouse,
  Lock,
  Building2,
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
  const [localVendorName, setLocalVendorName] = useState<string>("");
  const [warehouseLocationId, setWarehouseLocationId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState<string>("");

  const selectedPo = useMemo(
    () => purchaseOrders.find((p) => p.id === purchaseOrderId),
    [purchaseOrders, purchaseOrderId]
  );

  const isPoLinked = Boolean(purchaseOrderId && selectedPo);
  const isLocalVendor = supplierId === "__LOCAL_VENDOR__";

  // When PO changes, strictly lock and autofill Supplier and Destination Facility
  useEffect(() => {
    if (selectedPo) {
      if (selectedPo.supplier_id) setSupplierId(selectedPo.supplier_id);
      if (selectedPo.location_id) setWarehouseLocationId(selectedPo.location_id);
      setLocalVendorName("");
    }
  }, [selectedPo]);

  useEffect(() => {
    if (open) {
      setPurchaseOrderId("");
      setSupplierId(suppliers[0]?.id || "");
      setLocalVendorName("");
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
      setErrorMsg("Please select a supplier or local vendor.");
      return;
    }
    if (isLocalVendor && !localVendorName.trim()) {
      setErrorMsg("Please enter the local vendor / store name.");
      return;
    }
    if (!warehouseLocationId) {
      setErrorMsg("Please select a destination facility / location.");
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
      if (isLocalVendor) {
        fd.append("local_vendor_name", localVendorName.trim());
      }
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
    });
  };

  if (!open) return null;

  const targetLocation = warehouseLocations.find((w) => w.id === warehouseLocationId) as any;
  const targetSupplier = suppliers.find((s) => s.id === supplierId);

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
              {isPoLinked ? "Create Goods Receipt (From PO)" : "Direct Purchase Receipt / GRN"}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isPoLinked
                ? "Receive supplier delivery against approved purchase order"
                : "Direct / unplanned stock receipt into Shop or Warehouse without a PO"}
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
          {/* 1. Link Purchase Order (Smart Autofill & Lock) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Link Approved Purchase Order (Optional)
            </label>
            <Select
              value={purchaseOrderId}
              onValueChange={(val) => {
                setPurchaseOrderId(val);
                if (!val) {
                  setSupplierId(suppliers[0]?.id || "");
                  setLocalVendorName("");
                  setWarehouseLocationId(warehouseLocations[0]?.id || "");
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200 font-sans">
                <SelectValue placeholder="No Purchase Order (Direct / Local Shop Purchase)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs font-medium text-slate-600">
                  No Purchase Order (Direct / Local Shop Purchase)
                </SelectItem>
                {purchaseOrders.map((po) => (
                  <SelectItem key={po.id} value={po.id} className="text-xs font-medium">
                    {po.po_number} ({po.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isPoLinked ? (
              <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/70 px-2.5 py-1.5 rounded-md border border-blue-200/60 mt-1">
                <Lock className="h-3 w-3 shrink-0 text-blue-600" />
                <span>
                  <strong>Destination &amp; Supplier locked</strong> to {selectedPo.po_number}. Line items will be auto-populated.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/70 px-2.5 py-1.5 rounded-md border border-emerald-200/60 mt-1">
                <Store className="h-3 w-3 shrink-0 text-emerald-600" />
                <span>Direct receipt: Select your receiving shop/facility and vendor below.</span>
              </div>
            )}
          </div>

          {/* 2. Supplier & Destination Facility */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium text-slate-700">
                  Supplier / Vendor <span className="text-rose-500">*</span>
                </label>
                {isPoLinked && (
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                    <Lock className="h-2.5 w-2.5" /> PO Locked
                  </span>
                )}
              </div>
              {isPoLinked ? (
                <div className="h-8 rounded-md border border-slate-200 bg-slate-100/80 px-2.5 flex items-center text-xs text-slate-700 font-medium truncate">
                  {targetSupplier?.name || "PO Supplier"}
                </div>
              ) : (
                <Select value={supplierId} onValueChange={(val) => setSupplierId(val)}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Select supplier / local vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__LOCAL_VENDOR__" className="text-xs font-semibold text-emerald-700 bg-emerald-50/50">
                      🏪 + Local / Unregistered Vendor
                    </SelectItem>
                    <div className="h-px bg-slate-100 my-1" />
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs font-medium">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-medium text-slate-700">
                  Receiving Facility <span className="text-rose-500">*</span>
                </label>
                {isPoLinked && (
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                    <Lock className="h-2.5 w-2.5" /> PO Locked
                  </span>
                )}
              </div>
              {isPoLinked ? (
                <div className="h-8 rounded-md border border-slate-200 bg-slate-100/80 px-2.5 flex items-center justify-between text-xs text-slate-700 font-medium truncate">
                  <span className="truncate">{targetLocation?.name || "PO Destination"}</span>
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-200 text-slate-600 shrink-0 ml-1">
                    {targetLocation?.location_types?.name || targetLocation?.location_types?.code || "FACILITY"}
                  </span>
                </div>
              ) : (
                <Select
                  value={warehouseLocationId}
                  onValueChange={(val) => setWarehouseLocationId(val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Select facility / shop..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseLocations.map((w: any) => {
                      const typeCode = w.location_types?.code || "LOCATION";
                      const isWarehouse = typeCode === "WAREHOUSE" || typeCode === "CENTRAL_WAREHOUSE";
                      return (
                        <SelectItem key={w.id} value={w.id} className="text-xs">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{w.name}</span>
                            <span className={`font-mono text-[10px] px-1 py-0.2 rounded border ${
                              isWarehouse 
                                ? "text-blue-600 bg-blue-50 border-blue-200/50" 
                                : "text-emerald-700 bg-emerald-50 border-emerald-200/50"
                            }`}>
                              {w.location_types?.name || typeCode}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Local / Unregistered Vendor Name Input */}
          {!isPoLinked && isLocalVendor && (
            <div className="space-y-1 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/70 animate-in fade-in duration-150">
              <label className="block text-[11px] font-semibold text-emerald-900">
                Local Vendor / Store / Market Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={localVendorName}
                onChange={(e) => setLocalVendorName(e.target.value)}
                placeholder="e.g. Corner Supermarket, Metro Cash & Carry, Local Dairy..."
                className="h-8 text-xs bg-white border-emerald-300 font-sans"
                required
              />
              <p className="text-[10px] text-emerald-700">
                This vendor will be recorded with this direct receipt and tracked in your financials &amp; ledger.
              </p>
            </div>
          )}

          {/* 3. Invoice / Delivery Challan Number */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Invoice / Bill / Challan Number
            </label>
            <Input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-0881 or Shop Bill #4092"
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* 4. Invoice Date & Received Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Invoice / Bill Date
              </label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-8 text-xs font-sans"
              />
            </div>

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
          </div>

          {/* 5. Remarks / Delivery Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              Delivery Remarks / Local Purchase Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Local vendor purchase, vehicle #, seal status, delivery condition..."
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
              disabled={isPending || !supplierId || !warehouseLocationId || (isLocalVendor && !localVendorName.trim())}
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
