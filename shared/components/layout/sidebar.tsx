"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

interface NavItem {
  name: string;
  href: string;
  icon?: any;
  disabled?: boolean;
}

const DASHBOARD_NAV: NavItem[] = [
  { name: "Overview", href: "/dashboard" },
  { name: "Audit Log", href: "/audit" },
  { name: "Financial Overview", href: "/financial" },
];

const MASTER_DATA_NAV: NavItem[] = [
  { name: "Locations", href: "/locations" },
  { name: "Units", href: "/units" },
  { name: "Ingredient Categories", href: "/ingredients/categories" },
  { name: "Ingredients", href: "/ingredients" },
  { name: "Suppliers", href: "/suppliers" },
  { name: "Tax Categories", href: "/taxes" },
  { name: "Team Management", href: "/team" },
  { name: "Menu Management", href: "/menu" },
];

const INVENTORY_NAV: NavItem[] = [
  { name: "Purchase Orders", href: "/purchase-orders" },
  { name: "Goods Receipts", href: "/receiving" },
  { name: "Stock Transfers", href: "/stock-transfers" },
  { name: "Inventory Snapshot", href: "/inventory" },
  { name: "Inventory Ledger", href: "/inventory/ledger" },
];

const SALES_NAV: NavItem[] = [
  { name: "Orders Monitoring", href: "/orders" },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

  if (item.disabled) {
    return (
      <div className="flex items-center justify-between px-3 py-2 text-sm font-medium text-zinc-400 cursor-not-allowed">
        <span>{item.name}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-300 border border-zinc-200 rounded px-1.5 py-0.5">Soon</span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? "bg-[#eaf1e2] text-[#4a632a]"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {item.name}
    </Link>
  );
}

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white">
      <div className="flex h-24 shrink-0 items-center justify-center border-b border-zinc-200 p-4">
        <div className="relative h-full w-full flex items-center justify-center">
          <Image src="/logo.png" alt="Earthly Aaromas" fill className="object-contain" priority />
        </div>
      </div>
      
      <nav className="flex-1 space-y-8 px-4 py-6 overflow-y-auto">
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Dashboard</h3>
          {DASHBOARD_NAV.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>
        
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Sales</h3>
          {SALES_NAV.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>

        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Inventory</h3>
          {INVENTORY_NAV.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>

        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Master Data</h3>
          {MASTER_DATA_NAV.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}
