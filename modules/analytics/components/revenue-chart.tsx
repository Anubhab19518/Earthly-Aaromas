"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

interface DataPoint {
  date: string;
  actual: number;
  projected: number;
}

interface RevenueChartProps {
  initialData: DataPoint[];
  orgId: string;
  locationId: string;
}

const RANGES = [
  { label: "Day", value: "day" as const },
  { label: "Week", value: "week" as const },
  { label: "Month", value: "month" as const },
];

// Dot chart layout constants
const DOT_R = 6;
const DOT_PITCH = DOT_R * 2 + 2; // 14px per dot
const CHART_H = 240;
const AXIS_H = 28;
const LEFT_PAD = 50; // space for y-axis labels
const TOP_PAD = 36; // space for tooltip above the chart

function DotColumn({
  x,
  actual,
  projected,
  maxVal,
  isHighlighted,
}: {
  x: number;
  actual: number;
  projected: number;
  maxVal: number;
  isHighlighted: boolean;
}) {
  const MAX_DOTS = Math.floor(CHART_H / DOT_PITCH);
  const actualDots = maxVal > 0 ? Math.round((actual / maxVal) * MAX_DOTS) : 0;
  const projDots   = maxVal > 0 ? Math.round((projected / maxVal) * MAX_DOTS) : 0;
  const totalDots  = Math.max(actualDots, projDots);

  return (
    <g>
      {Array.from({ length: totalDots }, (_, i) => {
        const cy = CHART_H - i * DOT_PITCH - DOT_R;
        const isActual = i < actualDots;
        return (
          <circle
            key={i}
            cx={x}
            cy={cy}
            r={DOT_R}
            fill={
              isHighlighted
                ? isActual ? "#818cf8" : "#c7d2fe"
                : isActual ? "#2dd4bf" : "#99f6e4"
            }
            opacity={isActual ? 1 : 0.6}
          />
        );
      })}
    </g>
  );
}

export function RevenueChart({ initialData, orgId, locationId }: RevenueChartProps) {
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  const [data, setData] = useState<DataPoint[]>(initialData);
  const [isPending, startTransition] = useTransition();
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);

  const handleRangeChange = (newRange: "day" | "week" | "month") => {
    setRange(newRange);
    startTransition(async () => {
      const { getRevenueByPeriod } = await import(
        "@/modules/analytics/services/shop-analytics.actions"
      );
      const result = await getRevenueByPeriod(orgId, locationId, newRange);
      setData(result);
    });
  };

  const maxVal = Math.max(...data.map(d => Math.max(d.actual, d.projected)), 1);
  const MAX_DOTS = Math.floor(CHART_H / DOT_PITCH);

  // Dynamic column width to fill the container nicely based on data length.
  const COL_W = data.length <= 7 ? 80 : data.length <= 15 ? 46 : 34;

  const chartSvgWidth = LEFT_PAD + data.length * COL_W + 20;

  // Y-axis grid values
  const ySteps = [0, 0.33, 0.67, 1].map(pct => ({
    pct,
    y: CHART_H - pct * CHART_H,
    label: `₹${Math.round(maxVal * pct).toLocaleString()}`,
  }));

  // Highlighted column data
  const hi = highlightedIdx !== null ? data[highlightedIdx] : null;
  const hiX = highlightedIdx !== null
    ? LEFT_PAD + highlightedIdx * COL_W + COL_W / 2
    : null;
  const hiY = hi && maxVal > 0
    ? CHART_H - (hi.actual / maxVal) * CHART_H
    : null;

  return (
    <div className="rounded-xl bg-white border border-slate-100 overflow-hidden">
      {/* ── Card header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
        <h3 className="text-sm font-semibold text-slate-900">Revenue Analytics</h3>
        {/* Range pills */}
        <div className="flex items-center rounded-full border border-slate-200 overflow-hidden bg-slate-50 text-xs">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => handleRangeChange(r.value)}
              disabled={isPending}
              className={`px-3 py-1.5 font-medium transition-all ${
                range === r.value
                  ? "bg-sky-600 text-white rounded-full"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body: left info panel + right dot chart ─────────────────── */}
      <div className="flex" style={{ opacity: isPending ? 0.6 : 1 }}>

        {/* LEFT PANEL — legend + insight + CTA */}
        <div className="w-72 shrink-0 flex flex-col justify-between p-6 border-r border-slate-50">
          {/* Legend */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-teal-400 shrink-0" />
              <span className="text-sm text-slate-700 font-medium">Actual</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full border-2 border-teal-300 bg-teal-100 shrink-0" />
              <span className="text-sm text-slate-500">Projected</span>
            </div>
          </div>

          {/* Insight card */}
          <div className="mt-6 rounded-lg bg-slate-50 border border-slate-100 p-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              Track daily revenue trends and forecast to plan inventory and staffing.
            </p>
          </div>

          {/* CTA button */}
          <Link
            href="/orders"
            className="mt-6 block w-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:from-indigo-600 hover:to-violet-600 transition-all"
          >
            View Orders
          </Link>
        </div>

        {/* RIGHT: dot chart */}
        <div className="flex-1 min-w-0 overflow-x-auto p-4 pl-2">
          {data.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              No revenue data for this period.
            </div>
          ) : (
            <svg
              width={Math.max(chartSvgWidth, 260)}
              height={CHART_H + AXIS_H + TOP_PAD}
            >
              <g transform={`translate(0, ${TOP_PAD})`}>
                {/* Y-axis grid + labels */}
                {ySteps.map(({ y, label }, i) => (
                  <g key={`${label}-${i}`}>
                    <line
                      x1={LEFT_PAD}
                      y1={y}
                      x2={chartSvgWidth}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth={1}
                    />
                    <text
                      x={LEFT_PAD - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize={11}
                      fill="#94a3b8"
                    >
                      {label}
                    </text>
                  </g>
                ))}

                {/* Dashed line + pill for highlighted column */}
                {hi && hiX !== null && hiY !== null && hi.actual > 0 && (
                  <>
                    {/* Dashed horizontal line */}
                    <line
                      x1={hiX}
                      y1={hiY}
                      x2={chartSvgWidth - 4}
                      y2={hiY}
                      stroke="#818cf8"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      opacity={0.8}
                    />
                    {/* Dot at the right end of dashed line */}
                    <circle
                      cx={chartSvgWidth - 4}
                      cy={hiY}
                      r={3}
                      fill="#818cf8"
                    />
                    {/* Value pill above the column */}
                    <rect
                      x={hiX - 26}
                      y={hiY - 26}
                      width={52}
                      height={22}
                      rx={11}
                      fill="#6366f1"
                    />
                    <text
                      x={hiX}
                      y={hiY - 11}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight="700"
                      fill="white"
                    >
                      ₹{hi.actual.toFixed(0)}
                    </text>
                  </>
                )}

                {/* Dot columns */}
                {data.map((d, i) => {
                  const x = LEFT_PAD + i * COL_W + COL_W / 2;
                  const isHigh = highlightedIdx === i;
                  return (
                    <g
                      key={d.date}
                      onMouseEnter={() => setHighlightedIdx(i)}
                      onMouseLeave={() => setHighlightedIdx(null)}
                      style={{ cursor: "default" }}
                    >
                      {/* Invisible wider hit area */}
                      <rect
                        x={x - COL_W / 2}
                        y={-TOP_PAD}
                        width={COL_W}
                        height={CHART_H + TOP_PAD}
                        fill="transparent"
                      />
                      <DotColumn
                        x={x}
                        actual={d.actual}
                        projected={d.projected}
                        maxVal={maxVal}
                        isHighlighted={isHigh}
                      />
                      {/* Date label */}
                      <text
                        x={x}
                        y={CHART_H + AXIS_H - 6}
                        textAnchor="middle"
                        fontSize={10}
                        fill={isHigh ? "#6366f1" : "#94a3b8"}
                        fontWeight={isHigh ? "700" : "400"}
                      >
                        {d.date}
                      </text>
                      {/* Highlighted column underline */}
                      {isHigh && (
                        <rect
                          x={x - 12}
                          y={CHART_H + 2}
                          width={24}
                          height={2}
                          rx={1}
                          fill="#6366f1"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
