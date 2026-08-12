"use client";

import React, { useState, useEffect } from "react";

interface IngredientPieChartProps {
  stockLevels: any[];
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

export function IngredientPieChart({ stockLevels }: IngredientPieChartProps) {
  const [selectedName, setSelectedName] = useState(stockLevels[0]?.name || "");
  const [hovered, setHovered] = useState<"current" | "critical" | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    let start: number;
    let animationFrame: number;
    const duration = 1200; // 1.2s animation

    const animate = (time: number) => {
      if (!start) start = time;
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutExpo easing function for a snappy then smooth stop
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setAnimationProgress(ease);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [selectedName]);

  if (!stockLevels || stockLevels.length === 0) {
    return (
      <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-5 flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center text-xs text-slate-500 font-medium">
          No inventory data available.
        </div>
      </div>
    );
  }

  const selectedItem = stockLevels.find(s => s.name === selectedName) || stockLevels[0];
  const { current, critical_level, unit } = selectedItem;

  const total = current + critical_level;
  const noData = total === 0;

  const CX = 100;
  const CY = 100;
  const R = 90;
  const INNER_R = 65;

  const currentPct = noData ? 0 : Math.round((current / total) * 100);
  const criticalPct = noData ? 0 : 100 - currentPct;

  let currentEnd = noData ? 0 : (current / total) * 360;
  
  if (!noData) {
    if (critical_level > 0 && 360 - currentEnd < 4) {
       currentEnd = 356; 
    } else if (current > 0 && currentEnd < 4) {
       currentEnd = 4; 
    }
  }

  // Determine status color based on current stock vs critical
  const isCritical = current <= critical_level;
  const currentFill = isCritical ? "#f87171" : "#38bdf8"; // Red if critical, else blue
  const criticalFill = "#fbbf24"; // Amber/yellow for the critical reference slice

  let centerValue = noData ? "—" : current.toLocaleString("en-US", { maximumFractionDigits: 1 });
  let centerLabel = noData ? "No Data" : "IN STOCK";
  let centerUnit = noData ? "" : unit;
  
  if (hovered === "current") {
    centerValue = current.toLocaleString("en-US", { maximumFractionDigits: 1 });
    centerLabel = "IN STOCK";
    centerUnit = unit;
  } else if (hovered === "critical") {
    centerValue = critical_level.toLocaleString("en-US", { maximumFractionDigits: 1 });
    centerLabel = "CRITICAL";
    centerUnit = unit;
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-5 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Stock vs Critical Level</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Ratio of current stock to alert threshold</p>
        </div>
        
        <select
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
          className="w-auto min-w-[140px] max-w-[200px] text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
            backgroundPosition: "right 8px center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "20px",
          }}
        >
          {stockLevels.map((ing) => (
            <option key={ing.name} value={ing.name}>
              {ing.name} ({ing.unit})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col items-center justify-center flex-1">
        <div className="relative mb-6">
          <svg width={200} height={200} className="shrink-0 overflow-visible">
            {noData ? (
              <path 
                d={describeFilledArc(CX, CY, R, INNER_R, 0, 359.99 * Math.max(animationProgress, 0.001))} 
                fill="#f1f5f9" 
              />
            ) : current === 0 ? (
              <path 
                d={describeFilledArc(CX, CY, R, INNER_R, 0, 359.99 * Math.max(animationProgress, 0.001))} 
                fill={criticalFill} 
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={() => setHovered("critical")}
                onMouseLeave={() => setHovered(null)}
              />
            ) : critical_level === 0 ? (
              <path 
                d={describeFilledArc(CX, CY, R, INNER_R, 0, 359.99 * Math.max(animationProgress, 0.001))} 
                fill={currentFill} 
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={() => setHovered("current")}
                onMouseLeave={() => setHovered(null)}
              />
            ) : (
              <>
                <path 
                  d={describeFilledArc(CX, CY, R, INNER_R, 0, currentEnd * Math.max(animationProgress, 0.001))} 
                  fill={currentFill} 
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onMouseEnter={() => setHovered("current")}
                  onMouseLeave={() => setHovered(null)}
                />
                <path 
                  d={describeFilledArc(CX, CY, R, INNER_R, currentEnd * Math.max(animationProgress, 0.001), 359.99 * Math.max(animationProgress, 0.001))} 
                  fill={criticalFill} 
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onMouseEnter={() => setHovered("critical")}
                  onMouseLeave={() => setHovered(null)}
                />
              </>
            )}
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[22px] font-bold text-slate-800 tracking-tight">
              {centerValue}
            </span>
            <span className="text-[11px] font-bold text-slate-400 mt-0.5 tracking-wider">
              {centerLabel}
            </span>
            {centerUnit && (
              <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                {centerUnit}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-2">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onMouseEnter={() => setHovered("current")}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-3 h-3 rounded group-hover:opacity-80 transition-opacity" style={{ backgroundColor: currentFill }} />
            <span className="text-[12px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
              Current ({currentPct}%)
            </span>
          </div>
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onMouseEnter={() => setHovered("critical")}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-3 h-3 rounded group-hover:opacity-80 transition-opacity" style={{ backgroundColor: criticalFill }} />
            <span className="text-[12px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
              Critical ({criticalPct}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
