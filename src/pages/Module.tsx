import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useModules, Task } from "@/hooks/use-modules";
import GradePieChart from "@/components/GradePieChart";
import ContributionPieChart from "@/components/ContributionPieChart";
import SmallMetricPie from "@/components/SmallMetricPie";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

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

const ModulePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getModule,
    addTask,
    updateTask,
    deleteTask,
    deleteModule,
    updateModuleName,
    addFolder,
    toggleExclude,
  } = useModules();
  const module = id ? getModule(id) : undefined;

  const [taskName, setTaskName] = React.useState("");
  const [grade, setGrade] = React.useState<number | "">("");
  const [weight, setWeight] = React.useState<number | "">("");

  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState(module?.name ?? "");

  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [folderName, setFolderName] = React.useState("");
  const [folderWeight, setFolderWeight] = React.useState<number | "">("");

  React.useEffect(() => {
    setNameValue(module?.name ?? "");
  }, [module?.name]);

  // Ensure a default A2 task exists for this module (only once)
  React.useEffect(() => {
    if (!module) return;
    const hasA2 = module.tasks.some((t) => t.name === "A2");
    if (!hasA2) {
      // create A2 with grade 0 and weight 0 (user sets weight)
      addTask(module.id, { name: "A2", grade: 0, weight: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module?.id]);

  // Helper: compute folder grade from children (ignores excluded children)
  const computeFolderGrade = React.useCallback((folder: Task) => {
    if (!folder.children || folder.children.length === 0) return 0;
    const included = folder.children.filter((c) => !c.excluded);
    if (included.length === 0) return 0;
    const totalChildWeight = included.reduce((s, c) => s + (c.weight || 0), 0);
    if (totalChildWeight > 0) {
      const weighted = included.reduce((s, c) => s + ((c.grade || 0) / 100) * (c.weight || 0), 0);
      // normalize back to percentage
      return (weighted / totalChildWeight) * 100;
    }
    // fallback to simple average of grades (used when children don't have explicit weights)
    const avg = included.reduce((s, c) => s + (c.grade || 0), 0) / included.length;
    return avg;
  }, []);

  // Flatten tasks for charts: folders become a single pseudo-task with computed grade & folder weight
  const flattenedTasksForCharts: Task[] = React.useMemo(() => {
    const arr: Task[] = [];
    if (!module) return arr;
    for (const t of module.tasks) {
      if (t.isFolder) {
        if (t.excluded) continue;
        const grade = computeFolderGrade(t);
        arr.push({
          id: t.id,
          name: t.name,
          grade,
          weight: t.weight,
        } as Task);
      } else {
        if (t.excluded) continue;
        arr.push({ id: t.id, name: t.name, grade: t.grade, weight: t.weight });
      }
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module?.tasks, computeFolderGrade]);

  const totalWeight = flattenedTasksForCharts.reduce((s, t) => s + (t.weight || 0), 0);

  const onAddTask = (e?: React.FormEvent, parentFolderId?: string | null) => {
    e?.preventDefault();
    const parsedGrade = typeof grade === "number" ? grade : parseFloat(String(grade));
    const parsedWeight = typeof weight === "number" ? weight : parseFloat(String(weight));
    if (!taskName.trim()) return showError("Task name is required");
    if (Number.isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 100) return showError("Grade must be 0-100");
    if (Number.isNaN(parsedWeight) || parsedWeight < 0) return showError("Weight must be >= 0");
    if (!module) return showError("Module not loaded");
    addTask(module.id, { name: taskName.trim(), grade: Number(parsedGrade), weight: Number(parsedWeight) }, parentFolderId);
    setTaskName("");
    setGrade("");
    setWeight("");
    showSuccess("Task added");
  };

  const onCreateFolder = (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = typeof folderWeight === "number" ? folderWeight : parseFloat(String(folderWeight));
    if (!folderName.trim()) return showError("Folder name required");
    if (Number.isNaN(parsed) || parsed < 0) return showError("Folder weight must be >= 0");
    if (!module) return showError("Module not loaded");
    addFolder(module.id, folderName.trim(), Number(parsed));
    setFolderName("");
    setFolderWeight("");
    setCreatingFolder(false);
  };

  // prepare contribution/legend data so we can render a custom legend beside the metrics
  const taskContributions = flattenedTasksForCharts.map((t) => ({
    id: t.id,
    name: t.name || "(no name)",
    value: (t.grade / 100) * t.weight,
  }));
  const totalContribution = taskContributions.reduce((s, t) => s + t.value, 0);
  const remainder = Math.max(0, 100 - totalContribution);
  const legendData = taskContributions.length > 0
    ? [...taskContributions, { id: "remainder", name: "Remaining", value: remainder }]
    : [{ id: "remainder", name: "Remaining", value: 100 }];

  // derive remainder color from CSS variables to match chart
  let remainderFill = "#e5e7eb";
  try {
    const root = typeof document !== "undefined" ? document.documentElement : null;
    if (root) {
      const pop = getComputedStyle(root).getPropertyValue("--popover").trim();
      if (pop) remainderFill = `hsl(${pop})`;
    }
  } catch {
    /* ignore */
  }

  const passThreshold = 50; // percent required to pass
  const remainingToPass = Math.max(0, passThreshold - totalContribution); // 50% pass mark

  // Compute A2-related metrics (A2 can be inside folder or top-level)
  const findA2 = React.useCallback(() => {
    if (!module) return undefined;
    // search top-level
    let a2 = module.tasks.find((t) => t.name === "A2");
    if (a2) return a2;
    // search inside folders
    for (const t of module.tasks) {
      if (t.isFolder && t.children) {
        const c = t.children.find((ch) => ch.name === "A2");
        if (c) return c;
      }
    }
    return undefined;
  }, [module?.tasks]);

  const a2Task = findA2();
  const totalContributionExcludingA2 = flattenedTasksForCharts.reduce((s, t) => (t.name === "A2" ? s : s + (t.grade / 100) * t.weight), 0);
  const a2Weight = a2Task?.weight ?? 0;
  const rawRequiredForA2 = a2Weight > 0 ? ((passThreshold - totalContributionExcludingA2) * 100) / a2Weight : NaN;
  const requiredForA2Clamped = Number.isNaN(rawRequiredForA2) ? NaN : Math.max(0, Math.min(100, rawRequiredForA2));

  const formatRequiredA2 = () => {
    if (!a2Task) return null;
    if (a2Weight <= 0) return <div className="text-sm text-muted-foreground">Set A2 weight to compute required grade</div>;
    if (rawRequiredForA2 <= 0) return <div className="text-sm text-green-600">No mark needed — already passing</div>;
    if (rawRequiredForA2 > 100) return <div className="text-sm text-red-600">Even 100% on A2 won't reach pass</div>;
    return <div className="text-sm text-muted-foreground">You need <span className="font-medium">{requiredForA2Clamped.toFixed(2)}%</span> on A2 to reach {passThreshold}%</div>;
  };

  // NOTE: Instead of returning early when module is not found (which would skip hooks declared below),
  // we render a not-found UI inside the normal return so hooks order remains stable.

  return (
    <div className="min-h-screen bg-background p-4">
      {!module ? (
        <div className="max-w-[1700px] mx-auto flex items-center justify-center p-8 bg-card rounded shadow">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Module not found</h2>
            <Link to="/" className="text-blue-500 hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-[1700px] mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <ArrowLeft />
            </button>
            <div className="flex-1">
              {!editingName ? (
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold">{module.name}</h2>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    Rename
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!nameValue.trim()) return showError("Module name can't be empty");
                    updateModuleName(module.id, nameValue.trim());
                    setEditingName(false);
                    showSuccess("Module renamed");
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={nameValue}
                    onChange={(ev) => setNameValue(ev.target.value)}
                    className="px-2 py-1 border rounded bg-input text-foreground"
                  />
                  <button className="px-3 py-1 bg-primary text-primary-foreground dark:bg-slate-700 dark:text-white rounded text-sm">Save</button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(false);
                      setNameValue(module.name);
                    }}
                    className="px-3 py-1 text-sm"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!confirm(`Delete module "${module.name}"?`)) return;
                  deleteModule(module.id);
                  showSuccess("Module deleted");
                  navigate("/");
                }}
                className="flex items-center gap-2 px-3 py-2 rounded bg-red-50 text-red-600 dark:bg-red-900 dark:text-red-200"
              >
                <Trash2 size={16} /> Delete Module
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <section className="bg-card p-4 rounded shadow">
                <h3 className="font-semibold mb-2">Tasks</h3>

                {/* Create folder UI */}
                <div className="mb-3 flex items-center gap-2">
                  {creatingFolder ? (
                    <form onSubmit={onCreateFolder} className="flex gap-2 items-end">
                      <div>
                        <label className="text-sm text-muted-foreground">Folder name</label>
                        <input
                          value={folderName}
                          onChange={(e) => setFolderName(e.target.value)}
                          className="px-2 py-1 border rounded mt-1 bg-input text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Folder weight %</label>
                        <input
                          value={folderWeight}
                          onChange={(e) => setFolderWeight(e.target.value === "" ? "" : Number(e.target.value))}
                          type="number"
                          min={0}
                          step={0.1}
                          className="w-28 px-2 py-1 border rounded mt-1 bg-input text-foreground"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">Create</button>
                        <button type="button" onClick={() => setCreatingFolder(false)} className="px-3 py-1 text-sm">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setCreatingFolder(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-primary text-primary-foreground dark:bg-slate-700 dark:text-white text-sm">
                      <Plus size={14} /> Create Folder
                    </button>
                  )}
                </div>

                <form onSubmit={(e) => onAddTask(e)} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end mb-4">
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground">Name</label>
                    <input
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      className="w-full px-2 py-1 border rounded mt-1 bg-input text-foreground"
                      placeholder="e.g. Midterm Exam"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Grade %</label>
                    <input
                      value={grade}
                      onChange={(e) => setGrade(e.target.value === "" ? "" : Number(e.target.value))}
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      className="w-full px-2 py-1 border rounded mt-1 bg-input text-foreground"
                      placeholder="e.g. 85"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Weight %</label>
                    <input
                      value={weight}
                      onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                      type="number"
                      min={0}
                      step={0.1}
                      className="w-full px-2 py-1 border rounded mt-1 bg-input text-foreground"
                      placeholder="e.g. 20"
                    />
                  </div>
                  <div className="md:col-span-4 flex gap-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground dark:bg-slate-700 dark:text-white px-3 py-2 rounded text-sm"
                    >
                      <Plus size={14} /> Add Task
                    </button>
                  </div>
                </form>

                <div className="mt-4 space-y-2">
                  {module.tasks.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No tasks yet</div>
                  ) : (
                    <div className="divide-y">
                      {module.tasks.map((t) => {
                        const isA2 = t.name === "A2";
                        const isFolder = !!t.isFolder;
                        // compute folder grade for display
                        const folderGrade = isFolder ? computeFolderGrade(t) : t.grade;
                        return (
                          <div
                            key={t.id}
                            className={`py-2 flex flex-wrap items-start gap-3 md:flex-nowrap ${t.excluded ? "opacity-50 grayscale" : ""}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="font-medium">{t.name}</div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {isFolder
                                      ? `Folder weight: ${t.weight}% · Computed grade: ${folderGrade.toFixed(2)}%`
                                      : `${t.weight}% · ${t.grade}%`}
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {isA2 ? "A2 (final)" : null}
                                </div>
                              </div>

                              {isFolder && t.children && (
                                <div className="mt-3 ml-2 border-l pl-3 space-y-2">
                                  {/* Form to add a child into folder */}
                                  <FolderAddChildForm
                                    folder={t}
                                    moduleId={module.id}
                                    onAddChild={async (name, g) => {
                                      // children are equally weighted when averaged; keep child's weight 0 so computeFolderGrade falls back to equal-average
                                      await addTask(module.id, { name, grade: g, weight: 0 }, t.id);
                                    }}
                                  />
                                  <div className="space-y-1 mt-2">
                                    {t.children.length === 0 ? (
                                      <div className="text-xs text-muted-foreground">No items inside folder</div>
                                    ) : (
                                      t.children.map((c) => (
                                        <div key={c.id} className={`flex items-center justify-between gap-2 ${c.excluded ? "opacity-50 grayscale" : ""}`}>
                                          <div>
                                            <div className="text-sm font-medium">{c.name}</div>
                                            <div className="text-xs text-muted-foreground">Grade: {c.grade}%</div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => {
                                                const val = Number(prompt("New grade for task", String(c.grade)) ?? "");
                                                if (Number.isNaN(val)) return showError("Invalid number");
                                                updateTask(module.id, c.id, { grade: val });
                                              }}
                                              className="px-2 py-1 rounded text-sm"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => toggleExclude(module.id, c.id)}
                                              title={c.excluded ? "Enable task" : "Exclude task"}
                                              className="px-2 py-1 rounded text-sm"
                                            >
                                              {c.excluded ? "Enable" : "Exclude"}
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (!confirm(`Delete task "${c.name}"?`)) return;
                                                deleteTask(module.id, c.id);
                                                showSuccess("Task deleted");
                                              }}
                                              className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-800 text-red-600 dark:text-red-200"
                                              title="Delete task"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* actions for top-level tasks and folders */}
                            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap md:justify-end">
                              {!isFolder ? (
                                <>
                                  {!isA2 ? (
                                    <>
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        value={t.grade}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          updateTask(module.id, t.id, { grade: Number.isNaN(val) ? 0 : val });
                                        }}
                                        className="w-20 px-2 py-1 border rounded bg-input text-foreground"
                                      />
                                      <input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        value={t.weight}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          updateTask(module.id, t.id, { weight: Number.isNaN(val) ? 0 : val });
                                        }}
                                        className="w-20 px-2 py-1 border rounded bg-input text-foreground"
                                      />
                                    </>
                                  ) : (
                                    /* A2: allow editing weight but not grade input */
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.1}
                                      value={t.weight}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        updateTask(module.id, t.id, { weight: Number.isNaN(val) ? 0 : val });
                                      }}
                                      className="w-20 px-2 py-1 border rounded bg-input text-foreground"
                                      title="A2 weight"
                                    />
                                  )}
                                  <button
                                    onClick={() => toggleExclude(module.id, t.id)}
                                    title={t.excluded ? "Enable task" : "Exclude task"}
                                    className="px-2 py-1 rounded"
                                  >
                                    {t.excluded ? "Enable" : "Exclude"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!confirm(`Delete task "${t.name}"?`)) return;
                                      deleteTask(module.id, t.id);
                                      showSuccess("Task deleted");
                                    }}
                                    className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-800 text-red-600 dark:text-red-200"
                                    title="Delete task"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    value={t.weight}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      updateTask(module.id, t.id, { weight: Number.isNaN(val) ? 0 : val });
                                    }}
                                    className="w-20 px-2 py-1 border rounded bg-input text-foreground"
                                    title="Folder weight"
                                  />
                                  <button
                                    onClick={() => toggleExclude(module.id, t.id)}
                                    title={t.excluded ? "Enable folder" : "Exclude folder"}
                                    className="px-2 py-1 rounded"
                                  >
                                    {t.excluded ? "Enable" : "Exclude"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!confirm(`Delete folder "${t.name}"? This will remove its tasks.`)) return;
                                      deleteTask(module.id, t.id);
                                      showSuccess("Folder deleted");
                                    }}
                                    className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-800 text-red-600 dark:text-red-200"
                                    title="Delete folder"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-card p-4 rounded shadow">
                <h3 className="font-semibold mb-2">Calculated Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 flex items-center gap-3 bg-sidebar-accent rounded">
                    <SmallMetricPie valuePercent={totalWeight} size={64} color="#6366f1" />
                    <div>
                      <div className="text-xs text-muted-foreground">Total weight (sum of tasks/folders)</div>
                      <div className="text-xl font-bold">{totalWeight}%</div>
                    </div>
                  </div>

                  <div className="p-3 bg-sidebar-accent rounded">
                    <h4 className="text-sm text-muted-foreground mb-2">Weight Distribution</h4>
                    <GradePieChart tasks={flattenedTasksForCharts} />
                  </div>
                </div>
              </section>
            </div>

            <aside>
              <section className="bg-card p-4 rounded shadow">
                <h3 className="font-semibold mb-2">Contribution to Semester</h3>

                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Chart column: limit max width so it doesn't force the right column off-screen,
                      but allow it to shrink on small screens. */}
                  <div className="w-full sm:flex-shrink-0 sm:w-1/2 flex justify-center" style={{ maxWidth: 300 }}>
                    <ContributionPieChart tasks={flattenedTasksForCharts} height={220} showLegend={false} />
                  </div>

                  {/* Info + legend column: allow shrinking (min-w-0) so text wraps instead of overflowing.
                      Use min-content for the left grid column so labels size to content while the right column takes remaining space. */}
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[min-content_1fr] gap-4 items-start">
                    <div className="sm:pr-2 min-w-0">
                      <div className="text-xs text-muted-foreground">Contribution to semester</div>
                      <div className="text-2xl font-bold mt-1">{totalContribution.toFixed(2)}%</div>
                      <div className={`text-sm mt-2 ${remainingToPass <= 0 ? "text-green-600" : "text-muted-foreground"}`}>
                        Remaining to pass: {remainingToPass.toFixed(2)}%
                      </div>
                      <div className="text-sm text-muted-foreground mt-3">Tasks/folders: {module.tasks.length}</div>
                      <div className="mt-3">
                        {a2Task && (
                          <>
                            <div className="text-xs text-muted-foreground">A2 (final) requirement</div>
                            <div className="mt-1">{formatRequiredA2()}</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="space-y-2">
                        {legendData.map((d, i) => {
                          const isRemainder = d.id === "remainder";
                          const color = isRemainder ? remainderFill : COLORS[i % COLORS.length];
                          return (
                            <div key={d.id} className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <div className="text-sm text-muted-foreground break-words">
                                <span className="font-medium">{d.name}</span> — {d.value.toFixed(2)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-card p-4 rounded shadow mt-4">
                <div className="text-sm text-muted-foreground">
                  Tip: Use the small inputs beside each task to quickly edit grade and weight — changes save automatically. Use folders to group related tasks; the folder's weight counts toward the module and its grade is the average of the items inside.
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModulePage;

/* Small helper component for adding a child inside a folder */
function FolderAddChildForm({ folder, moduleId, onAddChild }: { folder: Task; moduleId: string; onAddChild: (name: string, grade: number) => Promise<void> }) {
  const [name, setName] = React.useState("");
  const [grade, setGrade] = React.useState<number | "">("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const g = typeof grade === "number" ? grade : parseFloat(String(grade));
        if (!name.trim()) return showError("Name required");
        if (Number.isNaN(g) || g < 0 || g > 100) return showError("Grade 0-100");
        onAddChild(name.trim(), Number(g));
        setName("");
        setGrade("");
      }}
      className="flex gap-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Child name"
        className="px-2 py-1 border rounded bg-input text-foreground text-sm"
      />
      <input
        value={grade}
        onChange={(e) => setGrade(e.target.value === "" ? "" : Number(e.target.value))}
        type="number"
        min={0}
        max={100}
        step={0.1}
        placeholder="Grade"
        className="w-20 px-2 py-1 border rounded bg-input text-foreground text-sm"
      />
      <button className="px-2 py-1 bg-primary text-primary-foreground rounded text-sm">Add</button>
    </form>
  );
}