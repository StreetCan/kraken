import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

type Task = {
  id: string;
  name?: string;
  grade?: number;
  weight?: number;
};

type GradePieChartProps = {
  tasks: Task[];
  height?: number;
};

const COLORS = [
  "#6366f1", // indigo-500
  "#06b6d4", // cyan-500
  "#34d399", // green-400
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#f97316", // orange-500
  "#a3e635", // lime-400
];

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

const GradePieChart: React.FC<GradePieChartProps> = ({ tasks, height = 220 }) => {
  const total = Math.round(tasks.reduce((s, t) => s + (t.weight || 0), 0));

  const data = tasks.map((t) => ({
    id: t.id,
    name: t.name || "(no name)",
    value: Number(t.weight || 0),
  }));

  // If total < 100, show remaining slice so the chart visually represents the full 100%
  const remainder = Math.max(0, 100 - total);
  const chartData = data.length > 0 ? [...data] : [{ id: "empty", name: "No tasks", value: 100 }];
  if (remainder > 0) {
    chartData.push({ id: "remainder", name: "Remaining", value: remainder });
  }

  // Derive colors from CSS variables so the chart fits both light and dark themes
  const remainderFill = resolveThemeColor("--popover", "--card", "--background") || "#e5e7eb";
  const strokeColor = resolveThemeColor("--border", "--input", "--ring") || "#e5e7eb";

  return (
    <div className="w-full">
      {/* fixed-height wrapper ensures the chart area is reserved so content below doesn't get pushed outside */}
      <div className="flex flex-col items-center" style={{ width: "100%" }}>
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
                stroke={strokeColor}
                strokeWidth={1}
              >
                {chartData.map((entry, index) => {
                  const isRemainder = entry.id === "remainder" || entry.id === "empty";
                  const color = isRemainder ? remainderFill : COLORS[index % COLORS.length];
                  return (
                    <Cell
                      key={entry.id}
                      fill={color}
                      stroke={strokeColor}
                      strokeWidth={1}
                      // ensure joins/caps look smooth in some renderers
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  );
                })}
              </Pie>
              <Tooltip
                formatter={(value: number) => `${value}%`}
                itemStyle={{ color: "var(--foreground)" }}
                contentStyle={{ background: "var(--card)" }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Moved inside the same wrapper and centered so it always renders within the card */}
        <div className="mt-2 text-sm text-muted-foreground text-center">
          Total weight: {total}%
        </div>
      </div>
    </div>
  );
};

export default GradePieChart;