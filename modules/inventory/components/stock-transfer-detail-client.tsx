"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Settings, Layout, MoreHorizontal, Calendar, Paperclip, CheckSquare, FileText, ArrowRight, CornerDownLeft, XCircle } from "lucide-react";

import {
  changeStockTransferStatus,
  deleteStockTransferItem,
  receiveStockTransfer,
} from "@/modules/inventory/services/stock-transfer.actions";
import { StockTransferForm } from "./stock-transfer-form";
import { StockTransferItemForm } from "./stock-transfer-item-form";

function StatusDropdown({ transfer, activeBranchId }: { transfer: any, activeBranchId?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const getBadgeStyle = () => {
    switch (transfer.status) {
      case "SHIPPED": return "bg-[#0052CC] text-white hover:bg-[#0047b3]";
      case "RECEIVED": return "bg-[#00875A] text-white hover:bg-[#007A51]";
      case "CANCELLED": return "bg-[#DE350B] text-white hover:bg-[#C9300A]";
      case "DRAFT": default: return "bg-[#DFE1E6] text-[#42526E] hover:bg-[#C1C7D0]";
    }
  };

  const getBadgeLabel = () => transfer.status === "DRAFT" ? "TO DO" : transfer.status === "SHIPPED" ? "IN TRANSIT" : transfer.status;

  const getValidTransitions = () => {
    if (transfer.status === "DRAFT" && activeBranchId === transfer.source_location_id) {
      return ["SHIPPED", "CANCELLED"];
    }
    if (transfer.status === "SHIPPED" && activeBranchId === transfer.destination_location_id) {
      return ["RECEIVED"];
    }
    return [];
  };

  const transitions = getValidTransitions();

  return (
    <div className="relative">
      <div 
        onClick={() => transitions.length > 0 && setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-[13px] font-medium transition-colors cursor-pointer shadow-sm ${getBadgeStyle()}`}
      >
        <span>{getBadgeLabel()}</span>
        {transitions.length > 0 && <ChevronDown className="h-3.5 w-3.5 opacity-90" />}
      </div>
      
      {isOpen && transitions.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#DFE1E6] rounded-[3px] shadow-lg z-50 py-1">
            {transitions.map(status => (
              <form key={status} action={async (fd) => {
                if (status === "RECEIVED") {
                   await receiveStockTransfer(fd);
                } else {
                   await changeStockTransferStatus(fd);
                }
                setIsOpen(false);
              }}>
                <input type="hidden" name="id" value={transfer.id} />
                {status !== "RECEIVED" && <input type="hidden" name="status" value={status} />}
                <button type="submit" className="w-full text-left px-3 py-2 text-[14px] text-[#172B4D] hover:bg-[#F4F5F7] transition-colors">
                  {status === "SHIPPED" ? "Mark as In Transit" : status === "RECEIVED" ? "Receive Transfer" : "Cancel Transfer"}
                </button>
              </form>
            ))}
          </div>
        </>
      )}
    </div>
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
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [isItemsOpen, setIsItemsOpen] = useState(true);
  
  const sourceLocation = locations.find((l) => l.id === transfer.source_location_id);
  const destinationLocation = locations.find((l) => l.id === transfer.destination_location_id);
  const isDraft = transfer.status === "DRAFT";
  
  // Calculate a mock progress bar width for the UI aesthetic
  const progressPercent = transfer.status === "RECEIVED" ? "100%" : transfer.status === "SHIPPED" ? "50%" : transfer.status === "CANCELLED" ? "0%" : "20%";
  const progressColor = transfer.status === "RECEIVED" ? "bg-[#00875A]" : transfer.status === "CANCELLED" ? "bg-[#DE350B]" : "bg-[#0052CC]";

  return (
    <div className="max-w-[1500px] mx-auto py-8 bg-white min-h-screen">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[14px] text-[#5E6C84] mb-4 font-medium px-8">
        <Link href="/stock-transfers" className="hover:underline flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-[#0052CC]" /> Stock Transfers
        </Link>
        <span>/</span>
        <div className="flex items-center gap-1.5">
          <CheckSquare className="h-4 w-4 text-[#0052CC]" /> {transfer.transfer_number}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 px-8">
        
        {/* LEFT COLUMN: Main Content */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Title & Top Actions */}
          <div className="space-y-4">
            <h1 className="text-[28px] font-medium text-[#172B4D] tracking-tight">
              {transfer.transfer_number}
            </h1>
            <div className="flex items-center gap-2">
              <Link href="/stock-transfers/new" className="flex items-center justify-center h-8 w-8 rounded bg-[#F4F5F7] text-[#42526E] hover:bg-[#EBECF0] transition-colors" title="Create New Stock Transfer">
                <Plus className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <h2 
              className="text-[16px] font-medium text-[#172B4D] flex items-center gap-2 -ml-6 cursor-pointer hover:bg-[#F4F5F7] py-1 px-2 rounded-[3px] w-fit transition-colors"
              onClick={() => setIsNotesOpen(!isNotesOpen)}
            >
              <ChevronDown className={`h-5 w-5 text-[#5E6C84] transition-transform ${isNotesOpen ? "" : "-rotate-90"}`} />
              Notes
            </h2>
            {isNotesOpen && (
              <div className="pl-0 pt-1">
                {transfer.notes ? (
                  <p className="text-[15px] text-[#172B4D] whitespace-pre-wrap leading-relaxed">
                    {transfer.notes}
                  </p>
                ) : (
                  <p className="text-[15px] text-[#5E6C84] italic">Add notes...</p>
                )}
              </div>
            )}
          </div>

          {/* Subtasks (Items) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between -ml-6">
              <h2 
                className="text-[16px] font-medium text-[#172B4D] flex items-center gap-2 cursor-pointer hover:bg-[#F4F5F7] py-1 px-2 rounded-[3px] w-fit transition-colors"
                onClick={() => setIsItemsOpen(!isItemsOpen)}
              >
                <ChevronDown className={`h-5 w-5 text-[#5E6C84] transition-transform ${isItemsOpen ? "" : "-rotate-90"}`} />
                Items
              </h2>
              <div className="flex items-center gap-1 text-[#5E6C84]">
                <button className="hover:bg-[#EBECF0] p-1.5 rounded"><MoreHorizontal className="h-4 w-4" /></button>
                <button className="hover:bg-[#EBECF0] p-1.5 rounded"><Layout className="h-4 w-4" /></button>
                {isDraft && activeBranchId === transfer.source_location_id && (
                  <button onClick={() => setIsAddingItem(true)} className="hover:bg-[#EBECF0] p-1.5 rounded"><Plus className="h-4 w-4" /></button>
                )}
              </div>
            </div>
            
            {isItemsOpen && (
              <>
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 bg-[#EBECF0] rounded-full overflow-hidden">
                    <div className={`h-full ${progressColor} rounded-full transition-all duration-500`} style={{ width: progressPercent }} />
                  </div>
                  <span className="text-[12px] text-[#5E6C84] font-medium w-12">{progressPercent}</span>
                </div>

                {items.length === 0 ? (
                  <div className="py-6 text-center text-[14px] text-[#5E6C84] border border-[#DFE1E6] rounded-[3px]">
                    No items added yet. Click '+' to begin.
                  </div>
                ) : (
                  <div className="rounded-[3px] border border-[#DFE1E6] bg-white overflow-hidden">
                    <table className="w-full text-[14px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#DFE1E6] bg-[#FAFBFC] text-[#5E6C84]">
                          <th className="px-4 py-2 font-medium w-[40%]">Ingredient</th>
                          <th className="px-4 py-2 font-medium w-[20%]">Quantity</th>
                          <th className="px-4 py-2 font-medium w-[20%]">Unit</th>
                          {isDraft && <th className="px-4 py-2 text-right w-[5%]"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DFE1E6]">
                        {items.map((item) => {
                          const ingredient = ingredients.find((i) => i.id === item.ingredient_id);
                          const unit = units.find((u) => u.id === item.unit_id);
                          
                          return (
                            <tr key={item.id} className="hover:bg-[#F4F5F7] transition-colors group">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2 text-[#0052CC] hover:underline cursor-pointer">
                                  <CheckSquare className="h-4 w-4" />
                                  <span className="font-medium">{ingredient?.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-[#172B4D]">{item.quantity}</td>
                              <td className="px-4 py-2.5 text-[#172B4D]">{unit?.abbreviation || unit?.name}</td>
                              {isDraft && (
                                <td className="px-4 py-2.5 text-right">
                                  {activeBranchId === transfer.source_location_id && (
                                    <form action={(fd) => { deleteStockTransferItem(fd); }}>
                                      <input type="hidden" name="id" value={item.id} />
                                      <input type="hidden" name="transferId" value={transfer.id} />
                                      <button type="submit" className="text-[#5E6C84] hover:text-[#DE350B] p-1 rounded hover:bg-[#FFEBE6] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </form>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {isDraft && activeBranchId === transfer.source_location_id && (
                          <tr className="bg-white hover:bg-[#F4F5F7] transition-colors">
                            <td colSpan={isDraft ? 4 : 3} className="p-0 border-t border-[#DFE1E6]">
                              <div className="flex items-center px-4 py-2 cursor-text" onClick={() => setIsAddingItem(true)}>
                                <div className="flex-1 text-[#5E6C84]">Name this item</div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 bg-[#FAFBFC] border border-[#DFE1E6] rounded px-2 py-1 text-[12px] font-medium text-[#42526E]">
                                    Item <ChevronDown className="h-3 w-3" />
                                  </div>
                                  <div className="bg-[#FAFBFC] border border-[#DFE1E6] rounded p-1 text-[#DFE1E6]">
                                    <CornerDownLeft className="h-4 w-4" />
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Details */}
        <div className="xl:col-span-1 space-y-6 pt-2">
          
          {/* Action Header */}
          <div className="flex items-center justify-between border-b border-[#DFE1E6] pb-4">
            <div className="flex items-center gap-2">
              <StatusDropdown transfer={transfer} activeBranchId={activeBranchId} />
            </div>
            
            <div className="flex items-center gap-1 text-[#5E6C84]">
              <button className="hover:bg-[#EBECF0] p-1.5 rounded text-[14px] font-medium flex items-center justify-center h-8 w-8">
                &lt;/&gt;
              </button>
              <button className="hover:bg-[#EBECF0] p-1.5 rounded flex items-center justify-center h-8 w-8">
                <Layout className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Details Panel */}
          <div className="border border-[#DFE1E6] rounded-[3px] bg-white overflow-hidden">
            <div className="px-4 py-3 bg-[#FAFBFC] flex items-center gap-2 cursor-pointer hover:bg-[#EBECF0] transition-colors border-b border-[#DFE1E6]">
              <ChevronDown className="h-4 w-4 text-[#5E6C84]" />
              <h3 className="text-[14px] font-semibold text-[#172B4D]">Details</h3>
            </div>
            
            <div className="p-4 space-y-4">
              
              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Source</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#FFAB00] text-white flex items-center justify-center text-[10px] font-bold">
                      {sourceLocation?.name?.charAt(0) || "S"}
                    </div>
                    <span className="text-[14px] text-[#172B4D] hover:underline cursor-pointer">{sourceLocation?.name || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Destination</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#0052CC] text-white flex items-center justify-center text-[10px] font-bold">
                      {destinationLocation?.name?.charAt(0) || "D"}
                    </div>
                    <span className="text-[14px] text-[#172B4D] hover:underline cursor-pointer">{destinationLocation?.name || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-[120px] shrink-0 text-[14px] text-[#5E6C84] mt-0.5">Created date</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[14px] text-[#172B4D] hover:underline cursor-pointer hover:bg-[#EBECF0] rounded px-1 -ml-1 transition-colors w-fit">
                    <Calendar className="h-4 w-4 text-[#5E6C84]" />
                    {format(new Date(transfer.created_at), "MMM d, yyyy")}
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

      {/* Dialogs */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-[600px] rounded-xl bg-white p-6 shadow-2xl relative border border-slate-200">
            <button onClick={() => setIsEditing(false)} className="absolute right-4 top-4 text-[#5E6C84] hover:text-[#172B4D] transition-colors cursor-pointer">
              <XCircle className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold mb-6 text-[#172B4D]">Edit Details</h2>
            <StockTransferForm 
              locations={locations} 
              transfer={transfer} 
            />
          </div>
        </div>
      )}

      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-[500px] rounded-xl bg-white p-6 shadow-2xl relative border border-slate-200">
            <button onClick={() => setIsAddingItem(false)} className="absolute right-4 top-4 text-[#5E6C84] hover:text-[#172B4D] transition-colors cursor-pointer">
              <XCircle className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold mb-6 text-[#172B4D]">Add Item</h2>
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
