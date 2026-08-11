"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowUpDown, Filter, Maximize2, Columns2 } from "lucide-react";

interface TableToolbarProps {
  showExpand?: boolean;
  columns?: { key: string; label: string; visible: boolean }[];
  sortOptions?: { label: string; value: string }[];
  activeSort?: string;
  onSort?: (direction: "asc" | "desc") => void;
  onSortChange?: (value: string) => void;
  onFilter?: () => void;
  onColumnToggle?: (key: string) => void;
  onExpand?: () => void;
}

export function TableToolbar({
  showExpand = false,
  columns,
  sortOptions,
  activeSort,
  onSort,
  onSortChange,
  onFilter,
  onColumnToggle,
  onExpand,
}: TableToolbarProps) {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showColumns, setShowColumns] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const handleSortClick = () => {
    const newDir = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(newDir);
    onSort?.(newDir);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (colRef.current && !colRef.current.contains(e.target as Node)) {
        setShowColumns(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortOptions(false);
      }
    }
    if (showColumns || showSortOptions) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showColumns, showSortOptions]);

  return (
    <div className="flex items-center justify-end gap-2 mb-4">
      {/* Sort Button / Dropdown */}
      {sortOptions && sortOptions.length > 0 ? (
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setShowSortOptions((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-violet-600 transition-colors"
          >
            <span>Sort</span>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
          
          {showSortOptions && (
            <div className="absolute right-0 top-10 z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white shadow-lg py-1">
              <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Sort By</p>
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSortChange?.(opt.value);
                    setShowSortOptions(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 ${activeSort === opt.value ? 'text-violet-600 font-semibold bg-violet-50/50' : 'text-slate-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleSortClick}
          title={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
          className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-violet-600 transition-colors"
        >
          <span>Sort</span>
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Filter Button */}
      {onFilter && (
        <button
          onClick={onFilter}
          title="Toggle filters"
          className="flex items-center justify-center rounded-xl bg-white border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Filter className="h-4 w-4" />
        </button>
      )}

      {/* Expand / Fullscreen Button */}
      {showExpand && (
        <button
          onClick={onExpand}
          title="Fullscreen"
          className="flex items-center justify-center rounded-xl bg-white border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}

      {/* Column Visibility Toggle */}
      {columns && columns.length > 0 && (
        <div className="relative" ref={colRef}>
          <button
            onClick={() => setShowColumns((v) => !v)}
            title="Show/hide columns"
            className="flex items-center justify-center rounded-xl bg-white border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Columns2 className="h-4 w-4" />
          </button>

          {showColumns && (
            <div className="absolute right-0 top-10 z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white shadow-lg py-1">
              <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Columns</p>
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => onColumnToggle?.(col.key)}
                    className="accent-violet-500 h-3.5 w-3.5 rounded"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
