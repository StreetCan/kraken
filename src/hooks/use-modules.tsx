import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionProvider";
import { showSuccess, showError } from "@/utils/toast";

/**
 * Task can be a normal task OR a folder (isFolder = true)
 * - For a folder: children contains nested tasks (folders are single-level for simplicity)
 * - excluded: when true the task (or folder) is ignored in grade calculations
 */
export type Task = {
  id: string;
  name: string;
  grade: number; // percentage 0-100 (for folders this is derived client-side)
  weight: number; // percentage (of module). For folder this is the folder's weight
  excluded?: boolean;
  isFolder?: boolean;
  children?: Task[]; // only present when isFolder === true
};

export type ModuleItem = {
  id: string;
  name: string;
  tasks: Task[];
};

const STORAGE_KEY = "dyad-grade-modules";

function genId(prefix = "") {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStorage(): ModuleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ModuleItem[];
  } catch {
    return [];
  }
}

function writeStorage(mods: ModuleItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mods));
  } catch {
    // ignore storage errors
  }
}

/* Helpers to operate on nested task trees (folders contain children) */

function mapTasksReplace(tasks: Task[], predicate: (t: Task) => boolean, replacer: (t: Task) => Task | null): Task[] {
  return tasks
    .map((t) => {
      if (predicate(t)) {
        const r = replacer(t);
        return r;
      }
      if (t.isFolder && t.children && t.children.length > 0) {
        return { ...t, children: mapTasksReplace(t.children, predicate, replacer) };
      }
      return t;
    })
    .filter(Boolean) as Task[];
}

function findTask(tasks: Task[], id: string): Task | undefined {
  for (const t of tasks) {
    if (t.id === id) return t;
    if (t.isFolder && t.children) {
      const found = findTask(t.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function useModules() {
  const { user } = useSession();

  // Start empty so unauthenticated users don't briefly see local modules.
  const [modules, setModules] = React.useState<ModuleItem[]>(() => []);
  const [modulesLoading, setModulesLoading] = React.useState(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // keep localStorage updated for offline fallback, but DO NOT overwrite cache when user is signed out.
  React.useEffect(() => {
    if (!user) return; // don't overwrite local cache on sign-out
    writeStorage(modules);
  }, [modules, user]);

  // Normalize remote tasks into our in-memory ModuleItem shape (flat tasks only)
  // Updated: reconstruct folders from server rows that use "FolderName / ChildName" naming.
  function normalizeRemoteData(data: any[]): ModuleItem[] {
    return (data || []).map((m) => {
      const rawTasks: { id: string; name: string; grade: number; weight: number }[] =
          (m.tasks || []).map((t: any) => ({
            id: String(t.id),
            name: String(t.name ?? ""),
            grade: Number(t.grade ?? 0),
            weight: Number(t.weight ?? 0),
          }));

      const childrenGroups: Record<
          string,
          { id: string; childName: string; grade: number; weight: number }[]
      > = {};
      const remainingById = new Map<string, { id: string; name: string; grade: number; weight: number }>();

      for (const t of rawTasks) {
        const sepIndex = t.name.indexOf(" / ");
        if (sepIndex > -1) {
          const folderName = t.name.slice(0, sepIndex).trim();
          const childName = t.name.slice(sepIndex + 3).trim();
          if (!childrenGroups[folderName]) childrenGroups[folderName] = [];
          childrenGroups[folderName].push({
            id: t.id,
            childName,
            grade: t.grade,
            weight: t.weight,
          });
        } else {
          remainingById.set(t.id, t);
        }
      }

      const tasksOut: Task[] = [];

      for (const folderName of Object.keys(childrenGroups)) {
        const parentEntry = Array.from(remainingById.values()).find((r) => r.name === folderName);

        if (parentEntry) {
          const childrenTasks: Task[] = childrenGroups[folderName].map((c) => ({
            id: c.id,
            name: c.childName,
            grade: c.grade,
            weight: c.weight,
            excluded: false,
            isFolder: false,
            children: [],
          }));

          tasksOut.push({
            id: parentEntry.id,
            name: parentEntry.name,
            grade: 0,
            weight: parentEntry.weight,
            excluded: false,
            isFolder: true,
            children: childrenTasks,
          });

          remainingById.delete(parentEntry.id);
        } else {
          const syntheticId = `f-import-${String(m.id)}-${folderName}`;
          const childrenTasks: Task[] = childrenGroups[folderName].map((c) => ({
            id: c.id,
            name: c.childName,
            grade: c.grade,
            weight: c.weight,
            excluded: false,
            isFolder: false,
            children: [],
          }));

          tasksOut.push({
            id: syntheticId,
            name: folderName,
            grade: 0,
            weight: 0,
            excluded: false,
            isFolder: true,
            children: childrenTasks,
          });
        }
      }

      for (const r of remainingById.values()) {
        tasksOut.push({
          id: r.id,
          name: r.name,
          grade: r.grade,
          weight: r.weight,
          excluded: false,
          isFolder: false,
          children: [],
        });
      }

      return {
        id: String(m.id),
        name: m.name ?? "",
        tasks: tasksOut,
      };
    });
  }

  // On user sign-in: fetch remote modules. If remote empty and local exists, import local->remote.
  React.useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user) {
        if (active) {
          setModules([]);
          setModulesLoading(false);
        }
        return;
      }

      if (active) setModulesLoading(true);

      const { data, error } = await supabase
          .from("modules")
          .select("id, name, created_at, tasks(id, name, grade, weight, created_at)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (error) {
        showError("Failed to load modules from account");
        const local = readStorage();
        if (active) setModules(local);
        if (active) setModulesLoading(false);
        return;
      }

      const remoteModules = normalizeRemoteData(data || []);

      if (remoteModules.length === 0 || remoteModules.every((m) => m.tasks.length === 0)) {
        const local = readStorage();

        if (local.length > 0) {
          for (const lm of local) {
            const { error: me } = await supabase
                .from("modules")
                .insert([{ id: lm.id, user_id: user.id, name: lm.name }]);

            if (me) {
              showError("Failed to upload local modules to account");
              continue;
            }

            const tasksToInsert: any[] = [];
            for (const t of lm.tasks) {
              if (t.isFolder && t.children && t.children.length > 0) {
                for (const c of t.children) {
                  tasksToInsert.push({
                    id: c.id,
                    module_id: lm.id,
                    name: `${t.name} / ${c.name}`,
                    grade: c.grade,
                    weight: c.weight,
                  });
                }
                tasksToInsert.push({
                  id: t.id,
                  module_id: lm.id,
                  name: t.name,
                  grade: 0,
                  weight: t.weight,
                });
              } else {
                tasksToInsert.push({
                  id: t.id,
                  module_id: lm.id,
                  name: t.name,
                  grade: t.grade,
                  weight: t.weight,
                });
              }
            }

            if (tasksToInsert.length > 0) {
              const { error: te } = await supabase.from("tasks").insert(tasksToInsert);
              if (te) showError("Failed to upload some tasks to account");
            }
          }

          const { data: data2, error: err2 } = await supabase
              .from("modules")
              .select("id, name, created_at, tasks(id, name, grade, weight, created_at)")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false });

          if (err2) {
            showError("Failed to load modules after import");
            const localAgain = readStorage();
            if (active) setModules(localAgain);
            if (active) setModulesLoading(false);
            return;
          }

          const imported = normalizeRemoteData(data2 || []);
          if (active) {
            setModules(imported);
            writeStorage(imported);
            showSuccess("Imported local modules to your account");
            setModulesLoading(false);
          }
          return;
        }
      }

      if (active) {
        try {
          const local = readStorage();

          const merged = remoteModules.map((rm) => {
            const localMod = local.find((lm) => lm.id === rm.id);
            const localFolders = localMod ? localMod.tasks.filter((t) => t.isFolder) : [];

            const tasksFromRemote = rm.tasks.map((rt) => {
              const lf = localFolders.find((f) => f.id === rt.id);
              if (lf) return lf;
              return rt;
            });

            for (const lf of localFolders) {
              if (!tasksFromRemote.some((t) => t.id === lf.id)) {
                tasksFromRemote.push(lf);
              }
            }

            return { ...rm, tasks: tasksFromRemote };
          });

          const localOnly = local.filter((lm) => !remoteModules.some((rm) => rm.id === lm.id));
          const finalModules = [...merged, ...localOnly];

          setModules(finalModules);
          writeStorage(finalModules);
        } catch {
          setModules(remoteModules);
          writeStorage(remoteModules);
        }

        setModulesLoading(false);
      } else {
        if (active) setModulesLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [user]);

  const addModule = async (name: string) => {
    const newMod: ModuleItem = { id: genId("m-"), name: name || "Untitled Module", tasks: [] };

    if (user) {
      const { error } = await supabase
          .from("modules")
          .insert([{ id: newMod.id, user_id: user.id, name: newMod.name }]);
      if (error) {
        showError("Failed to create module in account");
        return;
      }
    }

    setModules((s) => {
      const next = [newMod, ...s];
      writeStorage(next);
      return next;
    });

    showSuccess("Module added");
    return newMod.id;
  };

  const deleteModule = async (id: string) => {
    if (user) {
      await supabase.from("modules").delete().eq("id", id).eq("user_id", user.id);
      await supabase.from("tasks").delete().eq("module_id", id);
    }
    setModules((s) => {
      const next = s.filter((m) => m.id !== id);
      writeStorage(next);
      return next;
    });
  };

  const updateModuleName = async (id: string, name: string) => {
    if (user) {
      await supabase.from("modules").update({ name }).eq("id", id).eq("user_id", user.id);
    }
    setModules((s) => {
      const next = s.map((m) => (m.id === id ? { ...m, name } : m));
      writeStorage(next);
      return next;
    });
    showSuccess("Module renamed");
  };

  const getModule = (id: string) => modules.find((m) => m.id === id);

  const addFolder = async (moduleId: string, folderName: string, folderWeight: number) => {
    const newFolder: Task = {
      id: genId("f-"),
      name: folderName || "Folder",
      grade: 0,
      weight: Number(folderWeight) || 0,
      excluded: false,
      isFolder: true,
      children: [],
    };

    if (user) {
      await supabase.from("tasks").insert([
        {
          id: newFolder.id,
          module_id: moduleId,
          name: newFolder.name,
          grade: 0,
          weight: newFolder.weight,
        },
      ]);
    }

    setModules((s) => {
      const next = s.map((m) => (m.id === moduleId ? { ...m, tasks: [...m.tasks, newFolder] } : m));
      writeStorage(next);
      return next;
    });

    showSuccess("Folder created");
    return newFolder.id;
  };

  const addTask = async (
      moduleId: string,
      task: { name: string; grade: number; weight: number },
      parentFolderId?: string | null,
  ) => {
    const newTask: Task = {
      id: genId("t-"),
      name: task.name,
      grade: Number(task.grade),
      weight: Number(task.weight),
      excluded: false,
      isFolder: false,
      children: [],
    };

    if (user && !parentFolderId) {
      const { error } = await supabase.from("tasks").insert([
        {
          id: newTask.id,
          module_id: moduleId,
          name: newTask.name,
          grade: newTask.grade,
          weight: newTask.weight,
        },
      ]);
      if (error) {
        showError("Failed to create task in account");
        return;
      }
    }

    if (user && parentFolderId) {
      const mod = modules.find((m) => m.id === moduleId);
      const folder = mod?.tasks.find((t) => t.id === parentFolderId && t.isFolder);
      const serverName = folder ? `${folder.name} / ${newTask.name}` : newTask.name;
      await supabase.from("tasks").insert([
        {
          id: newTask.id,
          module_id: moduleId,
          name: serverName,
          grade: newTask.grade,
          weight: newTask.weight,
        },
      ]);
    }

    setModules((s) => {
      const next = s.map((m) => {
        if (m.id !== moduleId) return m;
        if (!parentFolderId) {
          return { ...m, tasks: [...m.tasks, newTask] };
        }
        const tasks2 = mapTasksReplace(m.tasks, (t) => t.id === parentFolderId, (t) => {
          if (!t) return t;
          if (!t.isFolder) return t;
          const children = [...(t.children || []), newTask];
          return { ...t, children };
        });
        return { ...m, tasks: tasks2 };
      });
      writeStorage(next);
      return next;
    });

    showSuccess("Task added");
    return newTask.id;
  };

  // Update a task or folder; will search nested folders
  const updateTask = async (moduleId: string, taskId: string, updates: Partial<Omit<Task, "id" | "children">>) => {
    // Attempt to persist update to server for any task id (best-effort)
    if (user) {
      const { name, grade, weight } = updates as any;
      await supabase.from("tasks").update({ name, grade, weight }).eq("id", taskId);
      // ignore errors intentionally
    }

    setModules((s) => {
      const next = s.map((m) => {
        if (m.id !== moduleId) return m;
        const tasks2 = mapTasksReplace(m.tasks, (t) => t.id === taskId, (t) => {
          if (!t) return t;
          return { ...t, ...updates };
        });
        return { ...m, tasks: tasks2 };
      });
      writeStorage(next);
      return next;
    });
  };

  // Delete a task (handles nested deletion) and ensure folder children are deleted server-side as well
  const deleteTask = async (moduleId: string, taskId: string) => {
    if (user) {
      try {
        // Attempt to collect all descendant IDs if this is a folder so we can delete them server-side too
        const mod = modules.find((m) => m.id === moduleId);
        let idsToDelete: string[] = [taskId];
        let folderNameForPattern: string | null = null;

        if (mod) {
          const target = findTask(mod.tasks, taskId);
          if (target) {
            const collectIds = (t: Task): string[] => {
              let ids = [t.id];
              if (t.isFolder && t.children) {
                for (const c of t.children) {
                  ids = ids.concat(collectIds(c));
                }
              }
              return ids;
            };
            idsToDelete = collectIds(target);

            if (target.isFolder) {
              folderNameForPattern = target.name;
            }
          }
        }

        // Fetch server-side tasks for the module to determine which rows to delete.
        // This helps catch cases where server rows use "FolderName / ChildName" naming
        // and may not have matching client IDs.
        const { data: serverTasks } = await supabase.from("tasks").select("id, name").eq("module_id", moduleId);
        const serverIdsToDelete = new Set<string>(idsToDelete);

        if (folderNameForPattern && serverTasks) {
          for (const st of serverTasks) {
            if (!st || !st.name) continue;
            const n = String(st.name);
            if (n === folderNameForPattern || n.startsWith(`${folderNameForPattern} / `)) {
              serverIdsToDelete.add(String(st.id));
            }
          }
        }

        const idsArray = Array.from(serverIdsToDelete);
        if (idsArray.length > 0) {
          await supabase.from("tasks").delete().in("id", idsArray);
        }
      } catch {
        // ignore server errors (best-effort)
      }
    }

    setModules((s) => {
      const next = s.map((m) => {
        if (m.id !== moduleId) return m;
        const filtered = (function walk(tasks: Task[]): Task[] {
          return tasks
              .filter((t) => t.id !== taskId)
              .map((t) => {
                if (t.isFolder && t.children) return { ...t, children: walk(t.children) };
                return t;
              });
        })(m.tasks);
        return { ...m, tasks: filtered };
      });
      writeStorage(next);
      return next;
    });
  };

  // Toggle exclusion for a task or folder
  const toggleExclude = (moduleId: string, taskId: string) => {
    setModules((s) => {
      const next = s.map((m) => {
        if (m.id !== moduleId) return m;
        const tasks2 = mapTasksReplace(m.tasks, (t) => t.id === taskId, (t) => {
          if (!t) return t;
          return { ...t, excluded: !t.excluded };
        });
        return { ...m, tasks: tasks2 };
      });
      writeStorage(next);
      return next;
    });
  };

  return {
    modules,
    modulesLoading,
    addModule,
    deleteModule,
    getModule,
    updateModuleName,
    addTask,
    addFolder,
    updateTask,
    deleteTask,
    toggleExclude,
    setModules,
  } as const;
}