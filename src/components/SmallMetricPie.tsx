import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type Props = {
  valuePercent: number; // 0-100
  size?: number; // height in px
  color?: string; // primary slice color
};

function resolveThemeColor(...vars: string[]) {
  try {
    const root = typeof document !== "undefined" ? document.documentElement : null;
    if (!root) return "";
    for (const v of vars) {
      const raw = getComputedStyle(root).getPropertyValue(v).trim();
      if (raw) {
        if (/^#/.test(raw) || raw.startsWith("rgb") || raw.startsWith("hsl")) {
          return raw;
        }
        return `hsl(${raw})`;
      }
    }
  } catch {
    // ignore
  }
  return "";
}

const SmallMetricPie: React.FC<Props> = ({ valuePercent, size = 80, color = "#6366f1" }) => {
  const clamped = Math.max(0, Math.min(100, valuePercent));
  const data = [{ id: "value", name: "value", value: clamped }, { id: "rem", name: "remaining", value: 100 - clamped }];

  // Derive colors from CSS variables so the remainder and stroke match theme
  const remainderFill = resolveThemeColor("--popover", "--card", "--background") || "#e5e7eb";
  const strokeColor = resolveThemeColor("--border", "--input", "--ring") || remainderFill;

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius="100%"
            innerRadius="60%"
            isAnimationActive={false}
            startAngle={90}
            endAngle={-270}
            paddingAngle={1}
            stroke={strokeColor}
            strokeWidth={1}
          >
            <Cell key="v" fill={color} stroke={strokeColor} />
            <Cell key="r" fill={remainderFill} stroke={strokeColor} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SmallMetricPie;