"use client";

import { useState, useTransition, useEffect } from "react";
import { format } from "date-fns";

interface StockMovementPoint {
  date: string;
  quantity: number;
}

interface IngredientOption {
  id: string;
  name: string;
  unit: string;
  criticalLevel: number;
}

interface InventoryMovementChartProps {
  orgId: string;
  locationId: string;
  ingredients: IngredientOption[];
}

// Chart layout constants
const CHART_W = 800;
const CHART_H = 260;
const PAD_L = 60;
const PAD_R = 20;
const PAD_T = 20;
const PAD_B = 35;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

export function InventoryMovementChart({ orgId, locationId, ingredients }: InventoryMovementChartProps) {
  const [selectedId, setSelectedId] = useState(ingredients[0]?.id || "");
  const [data, setData] = useState<StockMovementPoint[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const selected = ingredients.find((i) => i.id === selectedId);
  const criticalLevel = selected?.criticalLevel || 0;
  const unit = selected?.unit || "";

  // Fetch data on mount and on ingredient change
  useEffect(() => {
    if (!selectedId) return;
    startTransition(async () => {
      const { getIngredientMovementHistory } = await import(
        "@/modules/analytics/services/warehouse-analytics.actions"
      );
      const result = await getIngredientMovementHistory(orgId, locationId, selectedId);
      setData(result);
    });
  }, [selectedId, orgId, locationId]);

  // Compute chart scale
  const quantities = data.map((d) => d.quantity);
  const maxQ = Math.max(...quantities, criticalLevel * 1.2, 10);
  const minQ = 0;
  const range = maxQ - minQ || 1;

  // Animation state for the morphing entrance effect
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    let start: number;
    let animationFrame: number;
    const duration = 1200; // 1.2s animation

    const animate = (time: number) => {
      if (!start) start = time;
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutExpo easing for a snappy, smooth morph
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setAnimationProgress(ease);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    setAnimationProgress(0);
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [data]);

  // Map data to SVG coordinates
  const points = data.map((d, i) => {
    const startY = PAD_T + PLOT_H; // Bottom of the chart
    const finalY = startY - ((d.quantity - minQ) / range) * PLOT_H;
    const currentY = startY + (finalY - startY) * animationProgress;

    return {
      x: PAD_L + (i / Math.max(data.length - 1, 1)) * PLOT_W,
      y: currentY,
      ...d,
    };
  });

  // Build SVG path for the line
  const linePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
    : "";

  // Area path (fill under line)
  const areaPath = linePath && points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${PAD_T + PLOT_H} L ${points[0].x.toFixed(1)} ${PAD_T + PLOT_H} Z`
    : "";

  // Critical level Y
  const critY = criticalLevel > 0
    ? PAD_T + PLOT_H - ((criticalLevel - minQ) / range) * PLOT_H
    : null;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    value: Math.round(minQ + pct * range),
    y: PAD_T + PLOT_H - pct * PLOT_H,
  }));

  // X-axis labels (show ~5 evenly spaced)
  const xLabelCount = 5;
  const xLabels = data.length > 0
    ? Array.from({ length: xLabelCount }, (_, i) => {
        const idx = Math.round((i / (xLabelCount - 1)) * (data.length - 1));
        return { idx, label: format(new Date(data[idx].date), "MMM d") };
      })
    : [];

  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;

  if (ingredients.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 p-5">
        <p className="text-sm text-slate-400 text-center">No inventory items to chart.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden pt-5 flex flex-col">
      {/* Header with dropdown */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] font-bold text-slate-800">Stock Movement</span>
        </div>

        {/* Dropdown */}
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-auto min-w-[140px] max-w-[250px] mb-2 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
            backgroundPosition: "right 8px center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "20px",
          }}
        >
          {ingredients.map((ing) => (
            <option key={ing.id} value={ing.id}>
              {ing.name} ({ing.unit})
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ opacity: isPending ? 0.5 : 1, transition: "opacity 0.2s" }}>
        {data.length === 0 && !isPending ? (
          <div className="flex h-48 items-center justify-center text-xs text-slate-400">
            No movement data for this item.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="w-full"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Y-axis grid lines */}
            {yTicks.map(({ value, y }) => (
              <g key={value}>
                <line x1={20} y1={y} x2={CHART_W - 20} y2={y} stroke="#f8fafc" strokeWidth={1} />
                <text x={20} y={y - 6} textAnchor="start" fontSize={13} fill="#94a3b8" fontWeight="500">
                  {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                </text>
              </g>
            ))}

            {/* Area fill */}
            {areaPath && (
              <path d={areaPath} fill="url(#stockGradient)" />
            )}

            {/* Line */}
            {linePath && (
              <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth={3} strokeLinejoin="round" />
            )}

            {/* Critical level line */}
            {critY !== null && critY >= PAD_T && critY <= PAD_T + PLOT_H && (
              <>
                <line
                  x1={20}
                  y1={critY}
                  x2={CHART_W - 20}
                  y2={critY}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="8 6"
                  opacity={0.8}
                />
                <text
                  x={CHART_W - 20}
                  y={critY - 8}
                  textAnchor="end"
                  fontSize={14}
                  fill="#ef4444"
                  fontWeight="600"
                >
                  Critical ({criticalLevel} {unit})
                </text>
              </>
            )}

            {/* Hover interaction areas + dots */}
            {points.map((p, i) => {
              const colW = PLOT_W / Math.max(data.length - 1, 1);
              return (
                <g key={p.date}>
                  <rect
                    x={p.x - colW / 2}
                    y={PAD_T}
                    width={colW}
                    height={PLOT_H}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIdx(i)}
                  />
                  {hoveredIdx === i && (
                    <>
                      {/* Vertical guide */}
                      <line x1={p.x} y1={PAD_T} x2={p.x} y2={PAD_T + PLOT_H} stroke="#cbd5e1" strokeWidth={0.5} strokeDasharray="2 2" />
                      {/* Dot */}
                      <circle cx={p.x} cy={p.y} r={3} fill="#0ea5e9" stroke="white" strokeWidth={1.5} />
                    </>
                  )}
                </g>
              );
            })}

            {/* X-axis labels */}
            {xLabels.map(({ idx, label }) => {
              const xPos = points[idx]?.x || 0;
              // Prevent label from getting cut off at edges
              const clampedX = Math.max(25, Math.min(CHART_W - 25, xPos));
              return (
                <text
                  key={idx}
                  x={clampedX}
                  y={CHART_H - 10}
                  textAnchor="middle"
                  fontSize={13}
                  fill="#94a3b8"
                  fontWeight="500"
                >
                  {label}
                </text>
              );
            })}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="flex items-center justify-between mt-2 px-5">
          <span className="text-[13px] text-slate-500 font-medium">
            {format(new Date(hovered.date), "MMM d, yyyy")}
          </span>
          <span className="text-[14px] font-bold text-sky-600">
            {hovered.quantity.toLocaleString("en-US", { maximumFractionDigits: 1 })} {unit}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 mb-5 px-5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-[3px] bg-sky-400 rounded-full" />
          <span className="text-[12px] text-slate-600 font-semibold">Stock Level</span>
        </div>
        {criticalLevel > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-[3px] bg-red-400 rounded-full" style={{ borderTop: "2px dashed" }} />
            <span className="text-[12px] text-slate-600 font-semibold">Critical</span>
          </div>
        )}
      </div>
    </div>
  );
}
