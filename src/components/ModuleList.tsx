import React from "react";
import { Link } from "react-router-dom";
import { useModules, type Task } from "@/hooks/use-modules";
import { Trash2, Plus } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import ContributionPieChart from "@/components/ContributionPieChart";
import ModuleListSkeleton from "@/components/ModuleListSkeleton.tsx";

const ModuleList: React.FC = () => {
  const { modules, modulesLoading, addModule, deleteModule } = useModules();
  const [name, setName] = React.useState("");

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    const id = addModule(name.trim());
    setName("");
    showSuccess("Module added");
    return id;
  };

  // Compute folder grade similar to ModulePage: weighted average of children if they have weights,
  // otherwise simple average. Ignore excluded children.
  const computeFolderGrade = React.useCallback((folder: Task) => {
    if (!folder.children || folder.children.length === 0) return 0;
    const included = folder.children.filter((c) => !c.excluded);
    if (included.length === 0) return 0;
    const totalChildWeight = included.reduce((s, c) => s + (c.weight || 0), 0);
    if (totalChildWeight > 0) {
      const weighted = included.reduce((s, c) => s + ((c.grade || 0) / 100) * (c.weight || 0), 0);
      return (weighted / totalChildWeight) * 100;
    }
    const avg = included.reduce((s, c) => s + (c.grade || 0), 0) / included.length;
    return avg;
  }, []);

  // Flatten module tasks for chart consumption: folders become single pseudo-tasks with computed grade and folder weight.
  const flattenForChart = React.useCallback((tasks: Task[]) => {
    const out: Task[] = [];
    for (const t of tasks) {
      if (t.isFolder) {
        if (t.excluded) continue;
        const grade = computeFolderGrade(t);
        out.push({
          id: t.id,
          name: t.name,
          grade,
          weight: t.weight,
        } as Task);
      } else {
        if (t.excluded) continue;
        out.push({
          id: t.id,
          name: t.name,
          grade: t.grade,
          weight: t.weight,
        });
      }
    }
    return out;
  }, [computeFolderGrade]);

  return (
    <div className="max-w-[1700px] mx-auto w-full p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Modules</h2>
        <form
          onSubmit={handleAdd}
          className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New module name"
            className="w-full rounded-md border bg-input px-3 py-2 text-sm text-foreground sm:w-64"
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground dark:bg-slate-700 dark:text-white sm:w-auto sm:flex-none"
          >
            <Plus size={16} /> Add
          </button>
        </form>
      </div>

      { modulesLoading ? (
        <ModuleListSkeleton />
      ) : modules.length === 0 ? (
        <div className="p-8 bg-card dark:bg-sidebar-accent rounded shadow text-center text-muted-foreground">
          No modules yet — add one to get started.
        </div>
      ) : (
        // ensure grid items stretch to same height so cards grow to fit the tallest child
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {modules.map((m) => {
            const chartTasks = flattenForChart(m.tasks);
            return (
              <div
                key={m.id}
                // make the card fill the grid cell, give it enough base vertical space, and allow it to expand
                // to accommodate the chart and its labels by stretching children vertically.
                // Use a real border plus an inline style that uses the --border CSS variable with alpha.
                className="bg-card rounded-md p-4 shadow flex flex-col md:flex-row justify-between items-stretch gap-4 min-h-[140px] border"
                style={{ borderColor: "hsl(var(--border) / 0.35)" }}
              >
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/module/${m.id}`}
                    className="text-lg font-semibold hover:underline break-words whitespace-normal"
                  >
                    {m.name}
                  </Link>
                  <div className="text-sm text-muted-foreground mt-1">{m.tasks.length} tasks</div>
                </div>

                <div className="flex items-center gap-4">
                  {/* allow the chart column to size itself vertically (no fixed height) but prevent it from shrinking horizontally */}
                  <div className="w-32 flex-shrink-0">
                    <ContributionPieChart tasks={chartTasks} height={88} passThreshold={50} showLegend={false} />
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* Green 'Open' button with opaque background */}
                    <Link
                      to={`/module/${m.id}`}
                      className="inline-flex items-center px-3 py-1 rounded bg-green-100 text-green-800 text-sm hover:bg-green-200 dark:bg-[rgba(16,185,129,0.12)] dark:text-green-200"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => {
                        if (!confirm(`Delete module "${m.name}"? This will remove its tasks.`)) return;
                        deleteModule(m.id);
                        showSuccess("Module deleted");
                      }}
                      title="Delete module"
                      className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-800 text-red-600 dark:text-red-200"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModuleList;