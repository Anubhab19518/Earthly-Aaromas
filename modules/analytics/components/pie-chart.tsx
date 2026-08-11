"use client";

import React, { useState } from "react";

interface PieChartProps {
  inventoryValue: number;
  salesRevenue: number;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeFilledArc(x: number, y: number, radius: number, innerRadius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  const d = [
    "M", start.x, start.y, 
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
    "Z"
  ].join(" ");
  return d;
}

export function PieChart({ inventoryValue, salesRevenue }: PieChartProps) {
  const [hovered, setHovered] = useState<"inventory" | "sales" | null>(null);

  const total = inventoryValue + salesRevenue;
  const noData = total === 0;

  const CX = 80;
  const CY = 80;
  const R = 74;
  const INNER_R = 52;

  const inventoryPct = noData ? 0 : Math.round((inventoryValue / total) * 100);
  const salesPct = 100 - inventoryPct;

  let invEnd = noData ? 0 : (inventoryValue / total) * 360;
  
  if (!noData) {
    if (salesRevenue > 0 && 360 - invEnd < 4) {
       invEnd = 356; 
    } else if (inventoryValue > 0 && invEnd < 4) {
       invEnd = 4; 
    }
  }

  let centerValue = noData ? "—" : inventoryValue.toLocaleString("en-IN");
  let centerLabel = noData ? "No Data" : `IN STOCK (${inventoryPct}%)`;
  
  if (hovered === "inventory") {
    centerValue = inventoryValue.toLocaleString("en-IN");
    centerLabel = `IN STOCK (${inventoryPct}%)`;
  } else if (hovered === "sales") {
    centerValue = salesRevenue.toLocaleString("en-IN");
    centerLabel = `SOLD (${salesPct}%)`;
  }

  return (
    <div className="rounded-xl bg-white border border-slate-100 p-5 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Inventory vs Sales</h3>
        <p className="text-xs text-slate-400 mt-0.5">Stock and sales distribution</p>
      </div>

      <div className="flex flex-col items-center justify-center flex-1">
        <div className="relative mb-6">
          <svg width={160} height={160} className="shrink-0 overflow-visible">
            {noData ? (
              <path 
                d={describeFilledArc(CX, CY, R, INNER_R, 0, 359.99)} 
                fill="#f1f5f9" 
              />
            ) : inventoryValue === 0 ? (
              <path 
                d={describeFilledArc(CX, CY, R, INNER_R, 0, 359.99)} 
                fill="#e0f2fe" 
                className="cursor-pointer"
                onMouseEnter={() => setHovered("sales")}
                onMouseLeave={() => setHovered(null)}
              />
            ) : salesRevenue === 0 ? (
              <path 
                d={describeFilledArc(CX, CY, R, INNER_R, 0, 359.99)} 
                fill="#0ea5e9" 
                className="cursor-pointer"
                onMouseEnter={() => setHovered("inventory")}
                onMouseLeave={() => setHovered(null)}
              />
            ) : (
              <>
                <path
                  d={describeFilledArc(CX, CY, R, INNER_R, 0, invEnd)}
                  fill={hovered === "sales" ? "#bae6fd" : "#0ea5e9"}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-colors duration-200"
                  onMouseEnter={() => setHovered("inventory")}
                  onMouseLeave={() => setHovered(null)}
                />
                <path
                  d={describeFilledArc(CX, CY, R, INNER_R, invEnd, 359.99)}
                  fill={hovered === "inventory" ? "#f0f9ff" : "#e0f2fe"}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-colors duration-200"
                  onMouseEnter={() => setHovered("sales")}
                  onMouseLeave={() => setHovered(null)}
                />
              </>
            )}

            <text x={CX} y={CY - 4} textAnchor="middle" fontSize={24} fontWeight="700" fill="#0f172a">
              {centerValue}
            </text>
            <text x={CX} y={CY + 16} textAnchor="middle" fontSize={11} fill="#64748b" className="font-semibold uppercase tracking-wider">
              {centerLabel}
            </text>
          </svg>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 w-full">
          <div 
            className="flex items-center gap-1.5 cursor-pointer group"
            onMouseEnter={() => setHovered("inventory")}
            onMouseLeave={() => setHovered(null)}
          >
            <div className={`h-2.5 w-2.5 rounded-sm bg-[#0ea5e9] shrink-0 transition-opacity ${hovered === "sales" ? "opacity-50" : "opacity-100"}`} />
            <span className={`text-xs transition-colors ${hovered === "inventory" ? "text-slate-900 font-medium" : "text-slate-600"}`}>
              In Stock <span className="font-semibold text-slate-900 ml-0.5">{inventoryValue.toLocaleString("en-IN")}</span> ({inventoryPct}%)
            </span>
          </div>
          <div 
            className="flex items-center gap-1.5 cursor-pointer group"
            onMouseEnter={() => setHovered("sales")}
            onMouseLeave={() => setHovered(null)}
          >
            <div className={`h-2.5 w-2.5 rounded-sm bg-[#e0f2fe] shrink-0 transition-opacity ${hovered === "inventory" ? "opacity-50" : "opacity-100"}`} />
            <span className={`text-xs transition-colors ${hovered === "sales" ? "text-slate-900 font-medium" : "text-slate-600"}`}>
              Sold <span className="font-semibold text-slate-900 ml-0.5">{salesRevenue.toLocaleString("en-IN")}</span> ({salesPct}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
