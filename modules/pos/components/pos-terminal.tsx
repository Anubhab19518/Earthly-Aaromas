"use client";

import { useState, useTransition } from "react";
import { ShoppingCart, Plus, Minus, Trash2, User, Phone, ClipboardList } from "lucide-react";
import { createOrderAction } from "../services/order.actions";
import { CreateOrderPayload } from "../schemas/pos.schema";
import Link from "next/link";

interface MenuCategory {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  image_url: string | null;
  tax_categories?: { rate: number };
}

interface MenuVariant {
  id: string;
  menu_item_id: string;
  name: string;
  default_price: number;
}

interface BranchConfig {
  variant_id: string;
  is_available: boolean;
  price_override: number | null;
}

interface POSProps {
  locationId: string;
  categories: MenuCategory[];
  items: MenuItem[];
  variants: MenuVariant[];
  branchConfigs: BranchConfig[];
}

interface CartItem {
  cart_id: string;
  variant_id: string;
  name: string;
  variantName: string;
  quantity: number;
  unit_price: number;
  taxRate: number;
  tax_amount: number;
  line_total: number;
}

export function POSTerminal({ locationId, categories, items, variants, branchConfigs }: POSProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(categories[0]?.id || null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getVariantPrice = (variant: MenuVariant) => {
    const config = branchConfigs.find(c => c.variant_id === variant.id);
    if (config?.price_override !== null && config?.price_override !== undefined) {
      return config.price_override;
    }
    return variant.default_price;
  };

  const getAvailableVariants = (itemId: string) => {
    return variants.filter((v) => {
      if (v.menu_item_id !== itemId) return false;
      const config = branchConfigs.find(c => c.variant_id === v.id);
      if (config && config.is_available === false) return false;
      return true;
    });
  };

  const addToCart = (item: MenuItem, variant: MenuVariant) => {
    const price = getVariantPrice(variant);
    const taxRate = item.tax_categories?.rate || 0;

    setCart((prev) => {
      const existing = prev.find((c) => c.variant_id === variant.id);
      if (existing) {
        return prev.map((c) => {
          if (c.variant_id === variant.id) {
            const newQty = c.quantity + 1;
            const lineTotal = newQty * price;
            const taxAmount = (lineTotal * taxRate) / 100;
            return { ...c, quantity: newQty, line_total: lineTotal, tax_amount: taxAmount };
          }
          return c;
        });
      }
      const lineTotal = price;
      const taxAmount = (lineTotal * taxRate) / 100;
      return [
        ...prev,
        {
          cart_id: Math.random().toString(36).substring(7),
          variant_id: variant.id,
          name: item.name,
          variantName: variant.name,
          quantity: 1,
          unit_price: price,
          taxRate,
          tax_amount: taxAmount,
          line_total: lineTotal,
        }
      ];
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.cart_id === cartId) {
        const newQty = c.quantity + delta;
        if (newQty < 1) return c;
        const lineTotal = newQty * c.unit_price;
        const taxAmount = (lineTotal * c.taxRate) / 100;
        return { ...c, quantity: newQty, line_total: lineTotal, tax_amount: taxAmount };
      }
      return c;
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.cart_id !== cartId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.line_total, 0);
  const taxAmount = cart.reduce((sum, c) => sum + c.tax_amount, 0);
  const grandTotal = subtotal + taxAmount;

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      setErrorMsg("Customer name is required.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: CreateOrderPayload = {
      location_id: locationId,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || null,
      items: cart.map(({ cart_id: _c, name: _n, variantName: _v, taxRate: _t, ...rest }) => rest),
      subtotal,
      discount_amount: 0,
      tax_amount: taxAmount,
      grand_total: grandTotal,
    };

    startTransition(async () => {
      const result = await createOrderAction(payload);
      if (result.success) {
        setSuccessMsg(`Order placed! #${result.orderId?.slice(-6).toUpperCase()} — Go to Order Queue to manage it.`);
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setTimeout(() => setSuccessMsg(null), 6000);
      } else {
        setErrorMsg(result.message);
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row overflow-hidden bg-[#FAFBFC] border-t border-[#DFE1E6]">

      {/* LEFT: Menu Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Categories Navbar */}
        <div className="bg-white border-b border-[#DFE1E6] overflow-x-auto shadow-sm z-10">
          <div className="flex p-3 px-6 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeCategoryId === cat.id
                    ? "bg-[#eaf1e2] text-[#4a632a] shadow-sm border border-[#4a632a]/20"
                    : "bg-white text-[#42526E] border border-transparent hover:bg-[#EBECF0] hover:text-[#172B4D]"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.filter(item => item.category_id === activeCategoryId).map((item) => {
              const itemVariants = getAvailableVariants(item.id);
              if (itemVariants.length === 0) return null;

              return (
                <div key={item.id} className="bg-white rounded-md border border-[#DFE1E6] hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
                  {item.image_url ? (
                    <div className="h-36 w-full shrink-0 border-b border-[#DFE1E6] bg-zinc-50 p-2">
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-36 w-full shrink-0 bg-gradient-to-br from-[#f2f6ed] to-[#eaf1e2] border-b border-[#DFE1E6] flex items-center justify-center">
                      <span className="text-4xl font-bold text-[#4a632a]/40">{item.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-[#172B4D] leading-tight line-clamp-2">{item.name}</h3>
                    <div className="mt-auto pt-4 space-y-2 w-full">
                      {itemVariants.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => addToCart(item, v)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white hover:bg-[#F4F5F7] rounded-md border border-[#DFE1E6] transition-colors group"
                        >
                          <span className="font-medium text-[#42526E] group-hover:text-[#172B4D]">{v.name}</span>
                          <span className="font-semibold text-[#172B4D]">₹{getVariantPrice(v).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Order Panel */}
      <div className="w-full lg:w-96 bg-white border-l border-[#DFE1E6] flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20">

        {/* Header */}
        <div className="p-4 border-b border-[#DFE1E6] flex items-center justify-between bg-[#FAFBFC]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#42526E]" />
            <h2 className="text-lg font-semibold text-[#172B4D]">New Order</h2>
          </div>
          <Link
            href="/employee/orders"
            className="flex items-center gap-1.5 rounded-md border border-[#DFE1E6] bg-white px-3 py-1.5 text-xs font-medium text-[#42526E] hover:bg-[#EBECF0] transition-colors"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Queue
          </Link>
        </div>

        {/* Customer Info */}
        <div className="p-4 border-b border-[#DFE1E6] space-y-2.5 bg-white">
          <p className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">Customer Info</p>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5E6C84]" />
            <input
              type="text"
              placeholder="Customer name *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-md border border-[#DFE1E6] pl-9 pr-3 py-2 text-sm text-[#172B4D] placeholder:text-[#5E6C84] focus:border-[#4a632a] focus:outline-none focus:ring-1 focus:ring-[#4a632a]"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5E6C84]" />
            <input
              type="tel"
              placeholder="Phone number (optional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-md border border-[#DFE1E6] pl-9 pr-3 py-2 text-sm text-[#172B4D] placeholder:text-[#5E6C84] focus:border-[#4a632a] focus:outline-none focus:ring-1 focus:ring-[#4a632a]"
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#5E6C84] space-y-2">
              <ShoppingCart className="h-8 w-8 opacity-30" />
              <p className="text-sm">Add items from the menu</p>
            </div>
          ) : (
            cart.map((c) => (
              <div key={c.cart_id} className="flex gap-3 items-start border-b border-[#DFE1E6] pb-3 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#172B4D] text-sm leading-tight truncate">{c.name}</p>
                  <p className="text-xs text-[#5E6C84] mt-0.5">{c.variantName} · ₹{c.unit_price.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="font-semibold text-[#172B4D] text-sm">₹{c.line_total.toFixed(2)}</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(c.cart_id, -1)}
                      className="h-6 w-6 rounded bg-[#F4F5F7] flex items-center justify-center hover:bg-[#EBECF0] text-[#42526E] transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-medium w-4 text-center text-[#172B4D]">{c.quantity}</span>
                    <button
                      onClick={() => updateQuantity(c.cart_id, 1)}
                      className="h-6 w-6 rounded bg-[#F4F5F7] flex items-center justify-center hover:bg-[#EBECF0] text-[#42526E] transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(c.cart_id)}
                      className="h-6 w-6 rounded bg-red-50 flex items-center justify-center hover:bg-red-100 text-red-500 ml-0.5 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary & Place Order */}
        <div className="p-4 bg-white border-t border-[#DFE1E6] space-y-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-[#5E6C84]">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#5E6C84]">
              <span>Tax</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#172B4D] text-base pt-2 border-t border-[#DFE1E6] mt-2">
              <span>Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-100 leading-snug">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-md border border-emerald-100 leading-snug">
              {successMsg}
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={cart.length === 0 || isPending || !customerName.trim()}
            className="w-full bg-[#4a632a] text-white font-semibold rounded-md py-3 hover:bg-[#3d5123] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm text-sm"
          >
            {isPending ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
