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
];

const FUTURE_NAV: NavItem[] = [
  { name: "Orders", href: "#", disabled: true },
  { name: "Analytics", href: "#", disabled: true },
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
      
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        <div>
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Dashboard</h3>
          <nav className="space-y-1">
            {DASHBOARD_NAV.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </nav>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Inventory</h3>
          <nav className="space-y-1">
            {INVENTORY_NAV.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </nav>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Master Data</h3>
          <nav className="space-y-1">
            {MASTER_DATA_NAV.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </nav>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Coming Soon</h3>
          <nav className="space-y-1">
            {FUTURE_NAV.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
