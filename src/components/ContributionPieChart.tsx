import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import type { Task } from "@/hooks/use-modules";

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

type Props = {
  tasks: Task[];
  height?: number;
  passThreshold?: number; // percent required to pass (defaults to 50)
  showLegend?: boolean; // whether to render the built-in recharts legend (default true)
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

const ContributionPieChart: React.FC<Props> = ({
  tasks,
  height = 140,
  passThreshold = 50,
  showLegend = true,
}) => {
  // Each task's contribution to semester = (grade/100) * weight
  const taskContributions = tasks.map((t) => ({
    id: t.id,
    name: t.name || "(no name)",
    value: (t.grade / 100) * t.weight,
  }));

  const totalContribution = taskContributions.reduce((s, t) => s + t.value, 0);
  const remainder = Math.max(0, 100 - totalContribution);

  const data =
    taskContributions.length > 0
      ? [...taskContributions.map((t) => ({ ...t })), { id: "remainder", name: "Remaining", value: remainder }]
      : [{ id: "remainder", name: "Remaining", value: 100 }];

  const hasAnything = totalContribution > 0;

  const remainingToPass = Math.max(0, passThreshold - totalContribution);

  // derive colors from CSS variables so the remainder and stroke match theme
  const remainderFill = resolveThemeColor("--popover", "--card", "--background") || "#e5e7eb";
  const strokeColor = resolveThemeColor("--border", "--input", "--ring") || "#e5e7eb";

  if (!hasAnything) {
    return (
      <div className="text-center">
        <div className="text-sm text-gray-500">Contribution to semester</div>
        <div className="text-xl font-bold mt-2">0%</div>
        <div className="text-xs text-gray-400 mt-1">No tasks with contribution yet</div>
        <div className="text-xs text-gray-500 mt-2">Remaining to pass: {passThreshold.toFixed(0)}%</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="45%"
              outerRadius="80%"
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
              paddingAngle={1}
              labelLine={false}
              stroke={strokeColor}
              strokeWidth={1}
            >
              {data.map((entry, index) => {
                if (entry.id === "remainder") {
                  return <Cell key="rem" fill={remainderFill} stroke={remainderFill} />;
                }
                return <Cell key={entry.id} fill={COLORS[index % COLORS.length]} stroke={remainderFill} />;
              })}
            </Pie>
            <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
            {showLegend && (
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ fontSize: 12 }}
                payload={data.map((d, i) => ({
                  id: d.id,
                  value: `${d.name} — ${d.value.toFixed(2)}%`,
                  type: d.id === "remainder" ? "square" : "circle",
                  color: d.id === "remainder" ? remainderFill : COLORS[i % COLORS.length],
                }))}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="text-center mt-2">
        <div className="text-xs text-gray-500">Contribution to semester</div>
        <div className="text-xl font-bold">{totalContribution.toFixed(2)}%</div>
        <div
          className={`text-sm mt-1 ${
            remainingToPass <= 0 ? "text-green-600" : "text-gray-600"
          }`}
        >
          Remaining to pass: {remainingToPass.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

export default ContributionPieChart;