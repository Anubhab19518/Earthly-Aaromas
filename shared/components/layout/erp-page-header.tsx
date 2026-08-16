"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useBranchContext } from "@/shared/providers/branch-context";
import {
  Share2,
  Zap,
  MessageSquare,
  Maximize2,
  MoreHorizontal,
  Plus,
  Building2,
  Check,
  Copy,
  Sliders,
  Bookmark,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";

export interface PageTab {
  id: string; // DOM element ID to scroll to
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number | string;
  badgeColor?: string;
}

export interface ErpPageHeaderProps {
  category?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconBgColor?: string; // e.g. "bg-amber-400 text-amber-950"
  tabs?: PageTab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  actions?: React.ReactNode;
  shopNameOverride?: string;
  showBranchBadge?: boolean;
  colorTheme?: "blue" | "indigo";
}

export function ErpPageHeader({
  category = "Spaces",
  title,
  description,
  icon: Icon = Building2,
  iconBgColor = "bg-amber-400 text-amber-950",
  tabs = [],
  activeTabId: externalActiveTab,
  onTabChange,
  actions,
  shopNameOverride,
  showBranchBadge = true,
  colorTheme = "blue",
}: ErpPageHeaderProps) {
  const { activeBranchName, activeBranchType, orgName } = useBranchContext();
  const currentShopName = shopNameOverride || activeBranchName;

  const [activeTab, setActiveTab] = useState<string>(
    externalActiveTab || (tabs.length > 0 ? tabs[0].id : "")
  );
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync external activeTab prop if controlled
  useEffect(() => {
    if (externalActiveTab !== undefined) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  // Toast notification timer
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Scroll to section handler
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onTabChange) onTabChange(tabId);

    const el = document.getElementById(tabId);
    if (el) {
      // Offset scroll for sticky top navbar + sticky page header (~120px)
      const yOffset = -120;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      // Try scroll on main container first, fallback to window
      const mainContainer = el.closest("main");
      if (mainContainer) {
        const containerTop = mainContainer.getBoundingClientRect().top;
        const targetTop = el.getBoundingClientRect().top;
        const scrollTarget = mainContainer.scrollTop + (targetTop - containerTop) - 120;
        mainContainer.scrollTo({ top: Math.max(0, scrollTarget), behavior: "smooth" });
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  };

  // Scroll-Spy detection to highlight active tab as user scrolls
  const handleScrollSpy = useCallback(() => {
    if (tabs.length === 0) return;

    const mainContainer = document.querySelector("main");
    const containerTop = mainContainer ? mainContainer.getBoundingClientRect().top : 0;

    let currentSectionId = tabs[0].id;
    for (const tab of tabs) {
      const el = document.getElementById(tab.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        const relativeTop = mainContainer ? rect.top - containerTop : rect.top;
        if (relativeTop <= 140) {
          currentSectionId = tab.id;
        }
      }
    }

    if (currentSectionId !== activeTab && !externalActiveTab) {
      setActiveTab(currentSectionId);
    }
  }, [tabs, activeTab, externalActiveTab]);

  useEffect(() => {
    const mainContainer = document.querySelector("main");
    const target = mainContainer || window;
    target.addEventListener("scroll", handleScrollSpy, { passive: true });
    return () => target.removeEventListener("scroll", handleScrollSpy);
  }, [handleScrollSpy]);

  // Share action (copies URL)
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast("Page link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Toggle Fullscreen / Focus Mode
  const toggleFocusMode = () => {
    const main = document.querySelector("main");
    if (main) {
      if (!isFullscreen) {
        main.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  return (
    <div className="sticky -top-5 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 -mx-5 -mt-5 px-5 pt-3 pb-0 mb-6 shadow-2xs select-none transition-all">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white shadow-xl animate-in fade-in duration-200">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb / Category Row */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 tracking-tight mb-1.5">
        <span className="hover:text-slate-800 transition-colors cursor-pointer">{category}</span>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="text-slate-700 font-semibold truncate">{currentShopName}</span>
        {activeBranchType && (
          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] uppercase font-mono tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
            {activeBranchType}
          </span>
        )}
      </div>

      {/* Main Title + Context Badge + Action Buttons Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        
        {/* Left: Icon Badge + Page Title + Shop Indicator + Options */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Main Icon Badge matching the reference screenshot's rounded square */}
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md shadow-2xs font-bold ${iconBgColor}`}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              {title}
            </h1>



            {/* Ellipsis / Options Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 p-1 shadow-xl">
                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Page Actions
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={handleShare} className="flex items-center gap-2 text-xs cursor-pointer">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  <span>Share direct link</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.reload()} className="flex items-center gap-2 text-xs cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                  <span>Refresh page data</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => showToast("Added to bookmarked spaces")} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Bookmark className="h-3.5 w-3.5 text-slate-400" />
                  <span>Bookmark space</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Right: Custom Page Actions + Reference Standard Toolbar (Share, Quick action, Comments, Fullscreen) */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          {actions}


        </div>
      </div>

      {/* Description line if provided */}
      {description && (
        <p className="-mt-1 mb-2 text-xs text-slate-500 font-normal">
          {description}
        </p>
      )}

      {/* Bottom Row: Tab Navigation Bar (Matching exact screenshot layout & active blue underline) */}
      {tabs.length > 0 && (
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-1.5 py-2 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t-md ${
                    isActive
                      ? colorTheme === "indigo"
                        ? "border-indigo-600 text-indigo-600 font-semibold bg-indigo-50/40"
                        : "border-blue-600 text-blue-600 font-semibold bg-blue-50/40"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {TabIcon && (
                    <TabIcon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isActive
                          ? colorTheme === "indigo" ? "text-indigo-600" : "text-blue-600"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                  )}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-medium ${
                        tab.badgeColor || (isActive 
                          ? colorTheme === "indigo" ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700" 
                          : "bg-slate-100 text-slate-600")
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action icons placed in bottom right corner (without border or shadow, just in black color) */}
          <div className="flex items-center gap-1.5 shrink-0 mb-0.5">
            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex h-7 w-7 items-center justify-center text-slate-900 hover:text-black transition-colors cursor-pointer"
              title="Share page link"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
            </button>

            {/* Quick Action */}
            <button
              type="button"
              onClick={() => {
                const searchInput = document.querySelector("header input, header button") as HTMLElement;
                if (searchInput) searchInput.click();
              }}
              className="flex h-7 w-7 items-center justify-center text-slate-900 hover:text-black transition-colors cursor-pointer"
              title="Quick Action (Ctrl+K)"
            >
              <Zap className="h-3.5 w-3.5 text-slate-900" />
            </button>

            {/* Notes / Feedback */}
            <button
              type="button"
              onClick={() => showToast("Feedback notes logged")}
              className="flex h-7 w-7 items-center justify-center text-slate-900 hover:text-black transition-colors cursor-pointer"
              title="Page notes"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>

            {/* Maximize / Focus Mode */}
            <button
              type="button"
              onClick={toggleFocusMode}
              className="flex h-7 w-7 items-center justify-center text-slate-900 hover:text-black transition-colors cursor-pointer"
              title="Toggle Fullscreen Focus Mode"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
