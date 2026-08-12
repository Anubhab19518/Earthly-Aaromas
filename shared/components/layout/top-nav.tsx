"use client";

import { signOut } from "@/modules/auth/services/auth.actions";
import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { setActiveBranchCookie } from "@/shared/lib/branch.actions";
import {
  Bell,
  Search,
  ChevronDown,
  Building2,
  Check,
  Plus,
  HelpCircle,
  Settings,
  LogOut,
  User,
  SlidersHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/shared/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { SearchCommandDialog } from "./search-command-dialog";

interface Location {
  id: string;
  name: string;
}

interface TopNavProps {
  locations: Location[];
  userFullName: string;
  initialBranchId: string;
}

const HANDY_NAV_LINKS = [
  { name: "Orders", href: "/orders" },
  { name: "Inventory", href: "/inventory" },
  { name: "Team", href: "/team" },
  { name: "Menu", href: "/menu" },
  { name: "Financials", href: "/financial" },
];

export function TopNav({ locations, userFullName, initialBranchId }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [activeBranch, setActiveBranch] = useState(initialBranchId);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleBranchSelect = (branchId: string) => {
    if (branchId === activeBranch) return;
    setActiveBranch(branchId);
    startTransition(async () => {
      await setActiveBranchCookie(branchId);
      router.refresh();
    });
  };

  const activeBranchName = locations.find((l) => l.id === activeBranch)?.name || "Select Branch";
  const userInitial = userFullName ? userFullName.charAt(0).toUpperCase() : "U";

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4 gap-3 select-none z-30">
        
        {/* Left Section: Workspace Switcher + Handy Navigation Links */}
        <div className="flex items-center gap-2.5 min-w-0">
          
          {/* Workspace / Branch Switcher using Shadcn DropdownMenu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-indigo-700 font-bold">
                <Building2 className="h-3 w-3" />
              </div>
              <span className="truncate max-w-[130px] font-semibold text-slate-800">
                {activeBranchName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-0.5" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64 p-1.5 shadow-xl">
              <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Workspaces & Branches
              </DropdownMenuLabel>
              
              <DropdownMenuGroup className="space-y-0.5 mt-1">
                {locations.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-slate-400">No branches available</div>
                ) : (
                  locations.map((loc) => {
                    const isSelected = loc.id === activeBranch;
                    return (
                      <DropdownMenuItem
                        key={loc.id}
                        onClick={() => handleBranchSelect(loc.id)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-indigo-50/70 text-indigo-950 font-semibold"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                              isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Building2 className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-xs">{loc.name}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-1.5" />

              <DropdownMenuItem className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-indigo-600 font-medium hover:bg-indigo-50 rounded-md cursor-pointer">
                <Plus className="h-3.5 w-3.5" />
                <span>Create new branch</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <span>Manage workspaces</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Handy Navigation Links from project */}
          <div className="hidden lg:flex items-center gap-1 ml-1 text-xs font-medium text-slate-600">
            {HANDY_NAV_LINKS.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? "bg-slate-100 font-semibold text-slate-900"
                      : "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Center Section: Search Bar Trigger */}
        <div className="flex-1 max-w-md mx-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full text-left relative flex items-center rounded-md border border-slate-200/90 bg-slate-50/70 py-1.5 pl-8 pr-12 text-xs text-slate-500 hover:bg-slate-100/80 hover:border-slate-300 focus:outline-none transition-all shadow-2xs cursor-pointer group"
          >
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="truncate">Type a command or search...</span>
            <div className="pointer-events-none absolute right-2.5 flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 shadow-2xs">
              <span>ctrl</span>
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Right Section: Action Icons & User Profile Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Notifications */}
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
          </button>

          {/* Help */}
          <button
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Help & Support"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Settings */}
          <button
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* User Profile Avatar with Shadcn DropdownMenu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer">
              <Avatar className="h-8 w-8 border border-slate-200/90 shadow-2xs">
                <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-sky-600 text-white font-semibold text-xs">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl">
              <div className="px-2.5 py-2">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {userFullName || "User"}
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                  Active Member
                </p>
              </div>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer">
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>Account Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <form action={signOut} className="w-full">
                <button type="submit" className="w-full text-left">
                  <DropdownMenuItem className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-md cursor-pointer font-medium">
                    <LogOut className="h-3.5 w-3.5 text-rose-500" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </header>

      {/* Global Command Search Dialog */}
      <SearchCommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  );
}
