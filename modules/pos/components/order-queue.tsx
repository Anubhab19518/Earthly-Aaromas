"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  startPreparingAction,
  markOrderReadyAction,
  completeOrderAction,
  cancelOrderAction,
} from "../services/order.actions";
import { Clock, ChefHat, CheckCircle2, XCircle, RefreshCw, AlertCircle } from "lucide-react";

interface OrderItem {
  item_id: string;
  variant_id: string;
  variant_name: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface Order {
  order_id: string;
  order_number: string;
  order_status: "CONFIRMED" | "PREPARING" | "READY";
  customer_name: string;
  customer_phone: string | null;
  subtotal: number;
  tax_amount: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

interface OrderQueueProps {
  initialOrders: Order[];
  locationId: string;
}

type ActionKey = string;

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const STATUS_CONFIG = {
  CONFIRMED: {
    label: "New Orders",
    icon: Clock,
    cardBorder: "border-amber-200",
    cardBg: "bg-amber-50/30",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-400",
  },
  PREPARING: {
    label: "Preparing",
    icon: ChefHat,
    cardBorder: "border-blue-200",
    cardBg: "bg-blue-50/30",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-400 animate-pulse",
  },
  READY: {
    label: "Ready for Pickup",
    icon: CheckCircle2,
    cardBorder: "border-emerald-200",
    cardBg: "bg-emerald-50/30",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-400",
  },
} as const;

function OrderCard({
  order,
  onAction,
  actionLoading,
}: {
  order: Order;
  onAction: (orderId: string, action: "prepare" | "ready" | "complete" | "cancel") => Promise<void>;
  actionLoading: Record<ActionKey, boolean>;
}) {
  const [error, setError] = useState<string | null>(null);
  const config = STATUS_CONFIG[order.order_status];
  const isLoading = actionLoading[order.order_id] ?? false;

  const handleAction = async (action: "prepare" | "ready" | "complete" | "cancel") => {
    setError(null);
    await onAction(order.order_id, action);
  };

  return (
    <div className={`rounded-xl border ${config.cardBorder} ${config.cardBg} bg-white shadow-sm overflow-hidden`}>
      {/* Card Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#DFE1E6]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#172B4D]">{order.order_number}</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                {order.order_status}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-[#172B4D]">{order.customer_name}</p>
            {order.customer_phone && (
              <p className="text-xs text-[#5E6C84]">{order.customer_phone}</p>
            )}
          </div>
          <p className="text-xs text-[#5E6C84] whitespace-nowrap shrink-0">{timeAgo(order.created_at)}</p>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-1">
        {order.items.map((item) => (
          <div key={item.item_id} className="flex items-center justify-between text-sm">
            <span className="text-[#172B4D]">
              <span className="font-semibold">{item.quantity}×</span>{" "}
              {item.item_name}
              {item.variant_name && item.variant_name !== "Standard" && (
                <span className="text-[#5E6C84]"> ({item.variant_name})</span>
              )}
            </span>
            <span className="text-[#5E6C84] text-xs">₹{item.line_total.toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="px-4 pb-3 flex justify-between items-center text-sm border-t border-[#DFE1E6] pt-2">
        <span className="text-[#5E6C84]">Total</span>
        <span className="font-bold text-[#172B4D]">₹{order.grand_total.toFixed(2)}</span>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-100 p-2.5">
          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-snug">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        {order.order_status === "CONFIRMED" && (
          <>
            <button
              onClick={() => handleAction("prepare")}
              disabled={isLoading}
              className="flex-1 rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-[#3d5123] disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
            >
              <ChefHat className="h-3.5 w-3.5" />
              {isLoading ? "Starting..." : "Start Preparing"}
            </button>
            <button
              onClick={() => handleAction("cancel")}
              disabled={isLoading}
              className="rounded-md border border-[#DFE1E6] px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200 disabled:opacity-60 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {order.order_status === "PREPARING" && (
          <button
            onClick={() => handleAction("ready")}
            disabled={isLoading}
            className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isLoading ? "Updating..." : "Mark Ready"}
          </button>
        )}
        {order.order_status === "READY" && (
          <button
            onClick={() => handleAction("complete")}
            disabled={isLoading}
            className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isLoading ? "Completing..." : "Complete"}
          </button>
        )}
      </div>
    </div>
  );
}

export function OrderQueue({ initialOrders, locationId }: OrderQueueProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [actionLoading, setActionLoading] = useState<Record<ActionKey, boolean>>({});
  const [, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Sync when server re-renders with fresh data
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const handleAction = useCallback(
    async (orderId: string, action: "prepare" | "ready" | "complete" | "cancel") => {
      setActionLoading((prev) => ({ ...prev, [orderId]: true }));
      setGlobalError(null);

      let result: { success: boolean; message: string };
      if (action === "prepare") result = await startPreparingAction(orderId);
      else if (action === "ready") result = await markOrderReadyAction(orderId);
      else if (action === "complete") result = await completeOrderAction(orderId);
      else result = await cancelOrderAction(orderId);

      setActionLoading((prev) => ({ ...prev, [orderId]: false }));

      if (result.success) {
        startTransition(() => router.refresh());
      } else {
        setGlobalError(result.message);
      }
    },
    [router]
  );

  const confirmed = orders.filter((o) => o.order_status === "CONFIRMED");
  const preparing = orders.filter((o) => o.order_status === "PREPARING");
  const ready = orders.filter((o) => o.order_status === "READY");

  const handleRefresh = () => {
    startTransition(() => router.refresh());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-[#DFE1E6] px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[#172B4D]">Order Queue</h1>
          <p className="text-xs text-[#5E6C84] mt-0.5">{orders.length} active order{orders.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 rounded-md border border-[#DFE1E6] bg-white px-3 py-2 text-sm font-medium text-[#42526E] hover:bg-[#EBECF0] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Global Error */}
      {globalError && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 leading-snug">{globalError}</p>
          <button onClick={() => setGlobalError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Queue Columns */}
      <div className="flex-1 overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#5E6C84]">
            <CheckCircle2 className="h-12 w-12 opacity-20 mb-4" />
            <p className="text-lg font-semibold text-[#172B4D]">All clear!</p>
            <p className="text-sm mt-1">No active orders. New orders will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-full">
            {(["CONFIRMED", "PREPARING", "READY"] as const).map((status) => {
              const col = status === "CONFIRMED" ? confirmed : status === "PREPARING" ? preparing : ready;
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;

              return (
                <div key={status} className="flex flex-col border-r border-[#DFE1E6] last:border-r-0 overflow-hidden">
                  {/* Column header */}
                  <div className={`px-4 py-3 border-b border-[#DFE1E6] flex items-center gap-2 shrink-0 bg-white`}>
                    <Icon className="h-4 w-4 text-[#5E6C84]" />
                    <span className="text-sm font-semibold text-[#172B4D]">{config.label}</span>
                    <span className="ml-auto text-xs font-bold text-[#5E6C84] bg-[#F4F5F7] rounded-full px-2 py-0.5">
                      {col.length}
                    </span>
                  </div>

                  {/* Orders */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {col.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-[#5E6C84] text-center">
                        <p className="text-xs">No orders here</p>
                      </div>
                    ) : (
                      col.map((order) => (
                        <OrderCard
                          key={order.order_id}
                          order={order}
                          onAction={handleAction}
                          actionLoading={actionLoading}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
