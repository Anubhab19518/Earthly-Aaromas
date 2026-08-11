"use client";

import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, CreditCard, Receipt, Clock, User, Phone, MapPin } from "lucide-react";

interface OwnerOrderDetailClientProps {
  order: any;
  items: any[];
  payments: any[];
}

export function OwnerOrderDetailClient({ order, items, payments }: OwnerOrderDetailClientProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
      case "READY": return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "PREPARING": return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
      case "CONFIRMED": return "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20";
      case "CANCELLED": return "bg-red-50 text-red-700 ring-1 ring-red-600/20";
      default: return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link
          href="/orders"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Order {order.order_number}
            </h1>
            <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusColor(order.order_status)}`}>
              {order.order_status}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Created {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")} by {order.creator_name}
          </p>
        </div>
      </div>

      {/* Note for Owner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
        <div className="text-blue-700">
          <p className="text-sm font-semibold">Monitoring View</p>
          <p className="text-sm mt-1 opacity-90">This is a read-only view of the order. Order status changes can only be performed by employees operating the POS at the shop.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-zinc-500" />
              <h2 className="text-base font-semibold text-zinc-900">Order Items</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start pb-4 border-b border-zinc-100 last:border-0 last:pb-0">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900">{item.menu_variants?.name}</h4>
                      {item.menu_variants?.sku && <p className="text-xs text-zinc-500 mt-0.5">SKU: {item.menu_variants.sku}</p>}
                      <p className="text-sm text-zinc-500 mt-1">
                        {item.quantity} × ₹{Number(item.unit_price).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-900">₹{Number(item.line_total).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-zinc-50 px-6 py-4 border-t border-zinc-100 space-y-2">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Discount</span>
                <span>-₹{Number(order.discount_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Tax</span>
                <span>₹{Number(order.tax_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-2 border-t border-zinc-200 mt-2">
                <span>Total</span>
                <span className="text-sky-700">₹{Number(order.grand_total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Customer Details */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <h2 className="text-base font-semibold text-zinc-900">Customer Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{order.customer_name || "Guest Customer"}</p>
                  <p className="text-xs text-zinc-500">Name</p>
                </div>
              </div>
              {order.customer_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{order.customer_phone}</p>
                    <p className="text-xs text-zinc-500">Phone</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{order.locations?.name}</p>
                  <p className="text-xs text-zinc-500">Shop Location</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-zinc-500" />
              <h2 className="text-base font-semibold text-zinc-900">Payments</h2>
            </div>
            <div className="p-6 space-y-4">
              {payments.length === 0 ? (
                <p className="text-sm text-zinc-500">No payments recorded.</p>
              ) : (
                payments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{payment.payment_method}</p>
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${
                        payment.payment_status === "COMPLETED" ? "text-emerald-600" : "text-amber-600"
                      }`}>
                        {payment.payment_status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-900">₹{Number(payment.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-zinc-500">{format(new Date(payment.paid_at), "MMM d, h:mm a")}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
