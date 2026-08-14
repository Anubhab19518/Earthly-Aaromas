import { useState } from "react";
import { Bell, AlertTriangle, AlertCircle, PackageX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/shared/components/ui/dropdown-menu";
import type { InventoryAlert } from "@/modules/inventory/services/alert-policy.actions";

export function NotificationDropdown({ alerts }: { alerts: InventoryAlert[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer outline-none"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {alerts.length > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white">
              {alerts.length > 9 ? "9+" : alerts.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0 shadow-xl border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-lg">
          <DropdownMenuLabel className="p-0 font-semibold text-slate-900">
            Inventory Alerts
          </DropdownMenuLabel>
          <span className="text-[10px] font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
            {alerts.length} active
          </span>
        </div>
        
        <div className="max-h-[360px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <Bell className="h-5 w-5" />
              </div>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div className="p-1">
              {alerts.map((alert, idx) => {
                const isOutOfStock = alert.level === "OUT_OF_STOCK";
                const isCritical = alert.level === "CRITICAL";
                const isWarning = alert.level === "WARNING";
                
                return (
                  <DropdownMenuItem 
                    key={`${alert.ingredientId}-${idx}`} 
                    className="flex flex-col items-start gap-1 p-3 cursor-default hover:bg-slate-50 focus:bg-slate-50 rounded-md"
                  >
                    <div className="flex items-center w-full justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {isOutOfStock && <PackageX className="h-4 w-4 text-rose-500 shrink-0" />}
                        {isCritical && <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />}
                        {isWarning && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                        <span className="text-sm font-semibold text-slate-900 truncate" title={alert.ingredientName}>
                          {alert.ingredientName}
                        </span>
                      </div>
                      <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isOutOfStock ? "bg-rose-100 text-rose-700" :
                        isCritical ? "bg-orange-100 text-orange-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {isOutOfStock ? "Out of Stock" : alert.level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 pl-6">
                      Current quantity: <strong className="text-slate-700">{alert.quantity}</strong>
                    </p>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </div>
        
        {alerts.length > 0 && (
          <div className="p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
            <button 
              className="w-full text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors py-1.5"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
