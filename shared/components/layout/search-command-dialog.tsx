"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  UtensilsCrossed,
  BarChart3,
  ClipboardList,
  ArrowLeftRight,
  Truck,
  FileText,
  FlaskConical,
  MapPin,
  ScrollText,
  ReceiptText,
  Ruler,
  UserPlus,
  BookOpen,
} from "lucide-react";

interface SearchOption {
  id: string;
  title: string;
  description: string;
  href: string;
  category: "Quick Actions" | "Available Pages";
  icon: React.ElementType;
}

const SEARCH_OPTIONS: SearchOption[] = [
  {
    id: "action-invite",
    title: "Invite Team Member",
    description: "Send invitation link to onboard a new employee",
    href: "/team",
    category: "Quick Actions",
    icon: UserPlus,
  },
  {
    id: "action-orders",
    title: "View Active Orders",
    description: "Track customer sales transactions and order history",
    href: "/orders",
    category: "Quick Actions",
    icon: ShoppingCart,
  },
  {
    id: "action-inventory",
    title: "Check Inventory Snapshot",
    description: "Review current stock levels and ingredient counts",
    href: "/inventory",
    category: "Quick Actions",
    icon: Package,
  },
  {
    id: "page-dashboard",
    title: "Dashboard Overview",
    description: "High-level performance metrics & branch summary",
    href: "/dashboard",
    category: "Available Pages",
    icon: LayoutDashboard,
  },
  {
    id: "page-orders",
    title: "Orders & Sales",
    description: "Real-time POS sales transactions & order records",
    href: "/orders",
    category: "Available Pages",
    icon: ShoppingCart,
  },
  {
    id: "page-inventory",
    title: "Inventory Snapshot",
    description: "Stock levels & ingredient availability across branches",
    href: "/inventory",
    category: "Available Pages",
    icon: Package,
  },
  {
    id: "page-ledger",
    title: "Inventory Ledger",
    description: "Detailed stock movement ledger & history",
    href: "/inventory/ledger",
    category: "Available Pages",
    icon: BookOpen,
  },
  {
    id: "page-team",
    title: "Team Management",
    description: "Manage staff permissions, roles & active invitations",
    href: "/team",
    category: "Available Pages",
    icon: Users,
  },
  {
    id: "page-menu",
    title: "Menu Items",
    description: "Product catalog, pricing & category management",
    href: "/menu",
    category: "Available Pages",
    icon: UtensilsCrossed,
  },
  {
    id: "page-financial",
    title: "Financial Analytics",
    description: "Revenue analytics & expense ledger reports",
    href: "/financial",
    category: "Available Pages",
    icon: BarChart3,
  },
  {
    id: "page-purchase-orders",
    title: "Purchase Orders",
    description: "Stock replenishment & supplier PO tracking",
    href: "/purchase-orders",
    category: "Available Pages",
    icon: ClipboardList,
  },
  {
    id: "page-stock-transfers",
    title: "Stock Transfers",
    description: "Inter-branch stock transfers & inventory movements",
    href: "/stock-transfers",
    category: "Available Pages",
    icon: ArrowLeftRight,
  },
  {
    id: "page-receiving",
    title: "Goods Receipts",
    description: "Receiving stock shipments & delivery matching",
    href: "/receiving",
    category: "Available Pages",
    icon: FileText,
  },
  {
    id: "page-suppliers",
    title: "Suppliers & Vendors",
    description: "Supplier directory & vendor contact management",
    href: "/suppliers",
    category: "Available Pages",
    icon: Truck,
  },
  {
    id: "page-ingredients",
    title: "Ingredients Catalog",
    description: "Raw ingredients, batch tracking & stock units",
    href: "/ingredients",
    category: "Available Pages",
    icon: FlaskConical,
  },
  {
    id: "page-locations",
    title: "Locations & Branches",
    description: "Branch details & operational store settings",
    href: "/locations",
    category: "Available Pages",
    icon: MapPin,
  },
  {
    id: "page-audit",
    title: "Audit Log",
    description: "System activity & security event logs",
    href: "/audit",
    category: "Available Pages",
    icon: ScrollText,
  },
  {
    id: "page-taxes",
    title: "Tax Categories",
    description: "Tax configurations & slab settings",
    href: "/taxes",
    category: "Available Pages",
    icon: ReceiptText,
  },
  {
    id: "page-units",
    title: "Units of Measure",
    description: "Measurement units & stock conversion rules",
    href: "/units",
    category: "Available Pages",
    icon: Ruler,
  },
];

interface SearchCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommandDialog({ open, onOpenChange }: SearchCommandDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Keydown listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Reset query on open
  useEffect(() => {
    if (open) {
      setQuery("");
    }
  }, [open]);

  // Filtered options
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return SEARCH_OPTIONS;
    const lowerQuery = query.toLowerCase().trim();
    return SEARCH_OPTIONS.filter(
      (opt) =>
        opt.title.toLowerCase().includes(lowerQuery) ||
        opt.description.toLowerCase().includes(lowerQuery)
    );
  }, [query]);

  const quickActions = useMemo(
    () => filteredOptions.filter((opt) => opt.category === "Quick Actions"),
    [filteredOptions]
  );
  const availablePages = useMemo(
    () => filteredOptions.filter((opt) => opt.category === "Available Pages"),
    [filteredOptions]
  );

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/60 p-4 pt-16 sm:pt-24 animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange(false)}
      />
      
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Top Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
          />
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {filteredOptions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching pages or commands found for &quot;{query}&quot;
            </div>
          ) : (
            <>
              {/* Quick Actions */}
              {quickActions.length > 0 && (
                <div>
                  <h3 className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Actions
                  </h3>
                  <div className="space-y-1">
                    {quickActions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelect(opt.href)}
                          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100/80 active:bg-slate-100 transition-colors group cursor-pointer"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 border border-slate-200/70 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-950 transition-colors truncate">
                              {opt.title}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {opt.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Pages */}
              {availablePages.length > 0 && (
                <div>
                  <h3 className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Available Pages
                  </h3>
                  <div className="space-y-1">
                    {availablePages.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelect(opt.href)}
                          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100/80 active:bg-slate-100 transition-colors group cursor-pointer"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 border border-slate-200/70 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-950 transition-colors truncate">
                              {opt.title}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {opt.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[10px] font-medium text-slate-400">
          <span>Navigate with search results</span>
          <div className="flex items-center gap-1">
            <span className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">ESC</span>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
