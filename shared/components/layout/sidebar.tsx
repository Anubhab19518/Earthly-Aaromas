"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect, useRef, useMemo, KeyboardEvent } from "react";
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
  ChevronDown,
  FileText,
  Search,
  Star,
  X,
  Sparkles,
  Command,
} from "lucide-react";
import { Tooltip } from "@/shared/components/ui/tooltip";

export interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    items: [
      { id: "overview", name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { id: "audit", name: "Audit Log", href: "/audit", icon: ScrollText },
      { id: "financial", name: "Financials", href: "/financial", icon: BarChart3 },
    ],
  },
  {
    id: "sales",
    title: "Sales & POS",
    items: [
      { id: "orders", name: "Orders", href: "/orders", icon: ShoppingCart },
    ],
  },
  {
    id: "inventory",
    title: "Inventory Management",
    items: [
      { id: "snapshot", name: "Stock Snapshot", href: "/inventory", icon: Package },
      { id: "ledger", name: "Inventory Ledger", href: "/inventory/ledger", icon: BookOpen },
      { id: "stock-transfers", name: "Stock Transfers", href: "/stock-transfers", icon: ArrowLeftRight },
      { id: "purchase-orders", name: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
      { id: "receiving", name: "Goods Receipts (GRN)", href: "/receiving", icon: FileText },
    ],
  },
  {
    id: "master-data",
    title: "Master Data",
    items: [
      { id: "locations", name: "Facility Locations", href: "/locations", icon: MapPin },
      { id: "suppliers", name: "Suppliers Directory", href: "/suppliers", icon: Truck },
      { id: "ingredients", name: "Ingredients & Raw Materials", href: "/ingredients", icon: FlaskConical },
      { id: "units", name: "Measurement Units", href: "/units", icon: Ruler },
      { id: "taxes", name: "Tax Categories", href: "/taxes", icon: ReceiptText },
      { id: "team", name: "Team & Staff", href: "/team", icon: Users },
      { id: "menu", name: "Recipe & Menu Items", href: "/menu", icon: UtensilsCrossed },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const savedStarred = localStorage.getItem("tc_sidebar_starred");
      if (savedStarred) setStarredIds(JSON.parse(savedStarred));

      const savedCollapsed = localStorage.getItem("tc_sidebar_collapsed_sections");
      if (savedCollapsed) setCollapsedSections(JSON.parse(savedCollapsed));

      const savedWidth = localStorage.getItem("tc_sidebar_expanded");
      if (savedWidth !== null) setIsExpanded(savedWidth === "true");
    } catch {
      // ignore
    }
  }, []);

  // Save expanded state
  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tc_sidebar_expanded", String(next));
      } catch {}
      return next;
    });
  };

  // Toggle Star / Favorite
  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("tc_sidebar_starred", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Toggle Section Collapse
  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem("tc_sidebar_collapsed_sections", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Global Keyboard Shortcuts: [ to toggle sidebar, / or Ctrl+K to search
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
          setSearchQuery("");
          searchInputRef.current?.blur();
        }
        return;
      }

      if (e.key === "[" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleExpanded();
      } else if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter items if searching
  const isSearching = searchQuery.trim().length > 0;
  const filteredSections = useMemo(() => {
    if (!isSearching) return NAV_SECTIONS;
    const q = searchQuery.toLowerCase();
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.name.toLowerCase().includes(q)),
    })).filter((section) => section.items.length > 0);
  }, [searchQuery, isSearching]);

  // Starred Items
  const starredItems = useMemo(() => {
    return ALL_ITEMS.filter((item) => starredIds.includes(item.id));
  }, [starredIds]);

  const renderNavLink = (item: NavItem, sectionTitle?: string) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));
    const Icon = item.icon;
    const isStarred = starredIds.includes(item.id);

    const linkContent = (
      <Link
        href={item.href}
        className={`group relative flex items-center rounded-md text-xs transition-all duration-150 select-none ${
          isExpanded ? "px-2.5 py-1.5 gap-2.5 w-full" : "h-9 w-9 justify-center mx-auto"
        } ${
          isActive
            ? "bg-blue-50/90 text-blue-700 font-medium shadow-2xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-r before:bg-blue-600"
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-normal"
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors ${
            isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
          }`}
        />

        {isExpanded && (
          <>
            <span className="truncate flex-1 min-w-0">{item.name}</span>

            {/* Star Action Button (Jira Style hover pin) */}
            <button
              type="button"
              onClick={(e) => toggleStar(e, item.id)}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                isStarred
                  ? "opacity-100 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                  : "opacity-0 group-hover:opacity-100 text-slate-300 hover:bg-blue-50 hover:text-blue-600"
              }`}
              title={isStarred ? "Remove from favorites" : "Star as favorite"}
            >
              <Star
                className={`h-3 w-3 ${isStarred ? "fill-blue-600 text-blue-600" : ""}`}
              />
            </button>
          </>
        )}
      </Link>
    );

    // If sidebar is collapsed, wrap with floating right tooltip
    if (!isExpanded) {
      return (
        <Tooltip
          key={item.id}
          side="right"
          content={
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-white">{item.name}</span>
              {sectionTitle && (
                <span className="text-[10px] text-slate-400">({sectionTitle})</span>
              )}
            </div>
          }
        >
          {linkContent}
        </Tooltip>
      );
    }

    return <div key={item.id}>{linkContent}</div>;
  };

  return (
    <aside
      className={`h-full shrink-0 flex flex-col border-r border-slate-200/90 bg-white transition-[width] duration-200 ease-in-out select-none z-20 ${
        isExpanded ? "w-60" : "w-14"
      }`}
    >
      {/* 1. Header: Brand Logo & Workspace Info */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-slate-200/80 ${
          isExpanded ? "px-3.5 justify-between" : "justify-center px-2"
        }`}
      >
        <Link
          href="/dashboard"
          className={`flex items-center gap-2.5 min-w-0 rounded-md p-1 hover:bg-slate-50 transition-colors ${
            !isExpanded && "justify-center"
          }`}
          title="Earthly Aaromas ERP"
        >
          <div className="relative h-7 w-7 shrink-0 rounded-md bg-blue-50 border border-blue-200/50 flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="Earthly Aaromas"
              width={20}
              height={20}
              className="object-contain"
              priority
            />
          </div>
          {isExpanded && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-900 leading-tight truncate">
                  Earthly Aaromas
                </p>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="System Online" />
              </div>
              <p className="text-[10px] text-slate-500 leading-tight truncate">
                Tea Chain ERP
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* 2. Search / Quick Filter Bar (Jira Style) */}
      {isExpanded && (
        <div className="px-3 pt-2.5 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick search... (/)"
              className="w-full rounded-md border border-slate-200/90 bg-slate-50/60 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear (Esc)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="absolute right-2 top-1.5 text-[10px] font-mono text-slate-400 border border-slate-200/80 px-1 rounded bg-white select-none">
                /
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3.5 text-xs">
        {/* Starred / Pinned Section (if any pinned items & not searching) */}
        {!isSearching && starredItems.length > 0 && (
          <div className="space-y-0.5">
            {isExpanded ? (
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-medium text-slate-400 select-none">
                <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                  <Star className="h-3 w-3 fill-blue-600 text-blue-600" />
                  <span>Favorites</span>
                </span>
                <span className="text-[10px] text-slate-400">{starredItems.length}</span>
              </div>
            ) : (
              <div className="h-px bg-slate-200/80 my-1" />
            )}
            {starredItems.map((item) => renderNavLink(item, "Favorites"))}
            {isExpanded && <div className="h-px bg-slate-100 my-2" />}
          </div>
        )}

        {/* Regular Sections */}
        {filteredSections.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs px-2">
            <p>No matching pages</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-1 text-blue-600 hover:underline text-[11px] cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        ) : (
          filteredSections.map((section, sIdx) => {
            const isCollapsed = !isSearching && !!collapsedSections[section.id];

            return (
              <div key={section.id} className="space-y-0.5">
                {isExpanded ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors select-none group cursor-pointer"
                  >
                    <span>{section.title}</span>
                    <ChevronDown
                      className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                  </button>
                ) : (
                  sIdx > 0 && <div className="h-px bg-slate-200/70 my-1.5" />
                )}

                {/* Section Items */}
                {(!isCollapsed || !isExpanded) && (
                  <div className="space-y-0.5 animate-in fade-in duration-100">
                    {section.items.map((item) => renderNavLink(item, section.title))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* 4. Bottom Footer: Sidebar Collapse Toggle (Jira Style) */}
      <div className="border-t border-slate-200/80 p-2 bg-slate-50/50">
        <Tooltip
          side="right"
          content={
            <div className="flex items-center gap-1.5">
              <span>{isExpanded ? "Collapse sidebar" : "Expand sidebar"}</span>
              <kbd className="px-1 py-0.2 text-[10px] font-mono bg-slate-800 text-slate-200 rounded border border-slate-700">
                [
              </kbd>
            </div>
          }
        >
          <button
            type="button"
            onClick={toggleExpanded}
            className={`flex items-center gap-2 rounded-md py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer ${
              isExpanded ? "w-full px-2 justify-between" : "w-9 h-9 justify-center mx-auto"
            }`}
          >
            {isExpanded ? (
              <>
                <div className="flex items-center gap-2">
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                  <span>Collapse sidebar</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200/70 px-1 py-0.2 rounded">
                  [
                </span>
              </>
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
