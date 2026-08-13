"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ScrollText,
  BarChart3,
  ShoppingCart,
  Package,
  BookOpen,
  ArrowLeftRight,
  ClipboardList,
  Truck,
  MapPin,
  FlaskConical,
  Ruler,
  ReceiptText,
  Users,
  UtensilsCrossed,
  ChevronRight,
  ChevronLeft,
  FileText,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Dashboard",
    items: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Audit Log", href: "/audit", icon: ScrollText },
      { name: "Financial", href: "/financial", icon: BarChart3 },
    ],
  },
  {
    title: "Sales",
    items: [
      { name: "Orders", href: "/orders", icon: ShoppingCart },
    ],
  },
  {
    title: "Inventory",
    items: [
      { name: "Snapshot", href: "/inventory", icon: Package },
      { name: "Ledger", href: "/inventory/ledger", icon: BookOpen },
      { name: "Stock Transfers", href: "/stock-transfers", icon: ArrowLeftRight },
      { name: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
      { name: "Goods Receipts", href: "/receiving", icon: FileText },
    ],
  },
  {
    title: "Master Data",
    items: [
      { name: "Locations", href: "/locations", icon: MapPin },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
      { name: "Ingredients", href: "/ingredients", icon: FlaskConical },
      { name: "Units", href: "/units", icon: Ruler },
      { name: "Tax Categories", href: "/taxes", icon: ReceiptText },
      { name: "Team", href: "/team", icon: Users },
      { name: "Menu", href: "/menu", icon: UtensilsCrossed },
    ],
  },
];

function NavItemLink({
  item,
  isExpanded,
  onClick,
}: {
  item: NavItem;
  isExpanded: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <div
        title={item.name}
        className={`flex items-center gap-3 rounded-md px-2 py-2 text-slate-400 cursor-not-allowed ${
          isExpanded ? "w-full" : "w-10 justify-center"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {isExpanded && <span className="text-sm truncate">{item.name}</span>}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      title={!isExpanded ? item.name : undefined}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
        isExpanded ? "w-full" : "w-10 justify-center"
      } ${
        isActive
          ? "bg-sky-50 text-sky-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sky-600" : ""}`} />
      {isExpanded && <span className="truncate">{item.name}</span>}
    </Link>
  );
}

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggle = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <aside
      className={`h-full shrink-0 flex flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out select-none ${
        isExpanded ? "w-60" : "w-16"
      }`}
    >
      {/* Logo header */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-slate-200 ${
          isExpanded ? "px-4 gap-3" : "justify-center px-2"
        }`}
      >
        <div className="relative h-8 w-8 shrink-0">
          <Image src="/logo.png" alt="Earthly Aaromas" fill className="object-contain" priority />
        </div>
        {isExpanded && (
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 leading-tight truncate">Tea Chain</p>
            <p className="text-[10px] text-slate-500 leading-tight truncate">ERP Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.title} className="space-y-0.5">
            {isExpanded ? (
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
            ) : (
              sIdx > 0 && <div className="h-px bg-slate-100 my-2" />
            )}
            {section.items.map(item => (
              <NavItemLink
                key={item.href}
                item={item}
                isExpanded={isExpanded}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Expand / Collapse toggle */}
      <div className="border-t border-slate-200 p-2">
        <button
          onClick={toggle}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors ${
            isExpanded ? "w-full" : "w-10 justify-center"
          }`}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
