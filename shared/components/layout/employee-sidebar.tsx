"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { employeeSignOut } from "@/modules/auth/services/employee-signout.action";

interface EmployeeSidebarProps {
  orgName: string;
  userFullName: string;
}

const NAV = [
  { name: "Dashboard", href: "/employee" },
  { name: "POS Terminal", href: "/employee/pos" },
  { name: "Order Queue", href: "/employee/orders" },
  { name: "Profile", href: "/employee/profile", disabled: true },
];

export function EmployeeSidebar({ orgName, userFullName }: EmployeeSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-[#DFE1E6] bg-[#FAFBFC]">
      {/* Header with Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-[#DFE1E6] px-5 gap-3">
        <div className="relative h-8 w-8 overflow-hidden rounded-md flex-shrink-0 bg-white border border-[#DFE1E6] flex items-center justify-center">
          <Image src="/logo.png" alt="Logo" fill className="object-contain p-1" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 leading-tight">
            Employee Portal
          </p>
          <p className="truncate text-sm font-semibold text-[#172B4D] leading-tight">{orgName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {NAV.map((item) => {
          const isActive = pathname === item.href;
          if (item.disabled) {
            return (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-zinc-400 cursor-not-allowed"
              >
                <span>{item.name}</span>
                <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                  Soon
                </span>
              </div>
            );
          }
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#eaf1e2] text-[#4a632a]"
                  : "text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#DFE1E6] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#587333] text-sm font-semibold text-white">
            {userFullName.charAt(0).toUpperCase() || "E"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#172B4D]">{userFullName}</p>
            <p className="text-xs text-[#5E6C84]">Employee</p>
          </div>
        </div>
        <form action={employeeSignOut} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-md px-3 py-1.5 text-center text-sm font-medium text-zinc-600 border border-[#DFE1E6] bg-white hover:bg-zinc-50 hover:text-red-600 transition-colors shadow-sm"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
