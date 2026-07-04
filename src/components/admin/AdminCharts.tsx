"use client";

import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";
import { formatPrice } from "@/lib/utils";

// Single-hue palette — every chart here is one series, so identity is carried
// by the axis label, not color. Gold on a white admin surface.
const GOLD = "#b8935e";
const INK = "#0b0a09";
const MUTED = "#9a8f80";
const GRID = "#efe9df";

interface TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  currency?: boolean;
  unit?: string;
}

function ChartTooltip({ active, payload, label, currency, unit }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-brand-ink text-white px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      <p className="text-[10px] tracking-luxe uppercase text-brand-champagne mb-0.5">{label}</p>
      <p className="text-[13px] font-medium">
        {currency ? formatPrice(v) : `${v}${unit ?? ""}`}
      </p>
    </div>
  );
}

export function RevenueAreaChart({ data }: { data: { label: string; revenue: number }[] }) {
  const hasData = data.some((d) => d.revenue > 0);
  if (!hasData) return <EmptyChart message="No revenue in this period yet" />;

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 14, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: MUTED }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: MUTED }}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
          />
          <Tooltip
            cursor={{ stroke: GOLD, strokeWidth: 1, strokeDasharray: "3 3" }}
            content={<ChartTooltip currency />}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={GOLD}
            strokeWidth={2}
            fill="url(#revGradient)"
            dot={false}
            activeDot={{ r: 4, fill: GOLD, stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBars({
  data,
  currency = false,
  unit = "",
  height = 240,
}: {
  data: { label: string; value: number }[];
  currency?: boolean;
  unit?: string;
  height?: number;
}) {
  if (data.length === 0) return <EmptyChart message="No data yet" />;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 52, left: 6, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: INK }}
            tickLine={false}
            axisLine={false}
            width={116}
          />
          <Tooltip
            cursor={{ fill: "rgba(184,147,94,0.08)" }}
            content={<ChartTooltip currency={currency} unit={unit} />}
          />
          <Bar dataKey="value" fill={GOLD} radius={[0, 4, 4, 0]} barSize={16}>
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: ReactNode) => (currency ? formatPrice(Number(v)) : `${v}${unit}`)}
              style={{ fontSize: 11, fill: MUTED }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[240px] w-full flex items-center justify-center border border-dashed border-brand-ivory-deep">
      <p className="text-[12px] font-sans text-[#aaa]">{message}</p>
    </div>
  );
}
