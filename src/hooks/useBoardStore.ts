import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Board, ColumnKey, Config, Tag, Task, ThemeName } from "@/types/board";
import { DEFAULT_BOARD, DEFAULT_CONFIG, generateTaskId } from "@/lib/board-helpers";
import { validateImport, type ImportResult } from "@/lib/import-validate";
import { storage } from "@/lib/storage";
import type { CustomTheme } from "@/lib/theme-css";


const COL_KEYS: ColumnKey[] = ["todo", "inprogress", "done"];

export const useBoardStore = () => {
  const [board, setBoard] = useState<Board>(DEFAULT_BOARD);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const boardRef = useRef(board);
  const configRef = useRef(config);
  boardRef.current = board;
  configRef.current = config;

  useEffect(() => {
    setBoard(storage.loadBoard() ?? DEFAULT_BOARD);
    setConfig(storage.loadConfig() ?? DEFAULT_CONFIG);
    setIsLoaded(true);
  }, []);

  const saveBoard = useCallback((next: Board) => {
    setBoard(next);
    storage.saveBoard(next);
  }, []);

  const saveConfig = useCallback((next: Config) => {
    setConfig(next);
    storage.saveConfig(next);
  }, []);

  const updateBoard = useCallback(
    (fn: (b: Board) => Board) => saveBoard(fn(boardRef.current)),
    [saveBoard],
  );

  /* ---------- theme ---------- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("dark", "midnight", "glass", "theme-custom");

    const custom = config.customThemes.find((t) => t.id === config.theme);
    const styleId = "custom-theme-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if (custom) {
      root.classList.add("theme-custom");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = custom.css;
    } else {
      styleEl?.remove();
      if (config.theme === "dark") root.classList.add("dark");
      else if (config.theme === "midnight") root.classList.add("midnight");
      else if (config.theme === "glass") root.classList.add("glass");
    }
  }, [config.theme, config.customThemes]);

  /* ---------- background image ---------- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (config.background) {
      root.style.setProperty("--app-bg-image", `url("${config.background}")`);
      root.classList.add("has-bg-image");
    } else {
      root.style.removeProperty("--app-bg-image");
      root.classList.remove("has-bg-image");
    }
  }, [config.background]);

  const setBackground = useCallback(
    (dataUrl: string | null) => saveConfig({ ...configRef.current, background: dataUrl }),
    [saveConfig],
  );

  const addCustomTheme = useCallback(
    (theme: CustomTheme) =>
      saveConfig({
        ...configRef.current,
        customThemes: [...configRef.current.customThemes, theme],
        theme: theme.id,
      }),
    [saveConfig],
  );

  const removeCustomTheme = useCallback(
    (id: string) =>
      saveConfig({
        ...configRef.current,
        customThemes: configRef.current.customThemes.filter((t) => t.id !== id),
        theme: configRef.current.theme === id ? "light" : configRef.current.theme,
      }),
    [saveConfig],
  );

  const setTheme = useCallback(
    (theme: ThemeName) => saveConfig({ ...configRef.current, theme }),
    [saveConfig],
  );

  const setColumnColor = useCallback(
    (col: ColumnKey, color: string) =>
      saveConfig({
        ...configRef.current,
        colColors: { ...configRef.current.colColors, [col]: color },
      }),
    [saveConfig],
  );

  /* ---------- tasks ---------- */
  const createTask = useCallback(
    (data: Omit<Task, "id" | "deleted" | "deletedAt">) => {
      const id = generateTaskId();
      updateBoard((b) => ({
        ...b,
        tasks: { ...b.tasks, [id]: { ...data, id, deleted: false, deletedAt: null } },
        columns: { ...b.columns, [data.status]: [...b.columns[data.status], id] },
      }));
      return id;
    },
    [updateBoard],
  );

  const editTask = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      updateBoard((b) => {
        const existing = b.tasks[taskId];
        if (!existing) return b;
        const nextStatus = (updates.status ?? existing.status) as ColumnKey;
        const columns = { ...b.columns };
        if (nextStatus !== existing.status) {
          COL_KEYS.forEach((k) => {
            columns[k] = columns[k].filter((id) => id !== taskId);
          });
          columns[nextStatus] = [...columns[nextStatus], taskId];
        }
        return {
          ...b,
          columns,
          tasks: { ...b.tasks, [taskId]: { ...existing, ...updates, status: nextStatus } },
        };
      });
    },
    [updateBoard],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      updateBoard((b) => {
        const existing = b.tasks[taskId];
        if (!existing) return b;
        const columns = { ...b.columns };
        COL_KEYS.forEach((k) => {
          columns[k] = columns[k].filter((id) => id !== taskId);
        });
        return {
          ...b,
          columns,
          tasks: { ...b.tasks, [taskId]: { ...existing, deleted: true, deletedAt: Date.now() } },
        };
      });
    },
    [updateBoard],
  );

  const restoreTasks = useCallback(
    (ids: string[]) => {
      updateBoard((b) => {
        const tasks = { ...b.tasks };
        const columns = { ...b.columns };
        ids.forEach((id) => {
          const t = tasks[id];
          if (!t) return;
          const status = (t.status ?? "todo") as ColumnKey;
          tasks[id] = { ...t, deleted: false, deletedAt: null };
          if (!columns[status].includes(id)) columns[status] = [...columns[status], id];
        });
        return { ...b, tasks, columns };
      });
    },
    [updateBoard],
  );

  const purgeTasks = useCallback(
    (ids: string[]) => {
      updateBoard((b) => {
        const tasks = { ...b.tasks };
        ids.forEach((id) => delete tasks[id]);
        const columns = { ...b.columns };
        COL_KEYS.forEach((k) => {
          columns[k] = columns[k].filter((id) => !ids.includes(id));
        });
        return { ...b, tasks, columns };
      });
    },
    [updateBoard],
  );

  const moveTask = useCallback(
    (taskId: string, toColumn: ColumnKey, toIndex?: number) => {
      updateBoard((b) => {
        const existing = b.tasks[taskId];
        if (!existing) return b;
        const columns: Record<ColumnKey, string[]> = {
          todo: [...b.columns.todo],
          inprogress: [...b.columns.inprogress],
          done: [...b.columns.done],
        };
        COL_KEYS.forEach((k) => {
          columns[k] = columns[k].filter((id) => id !== taskId);
        });
        const idx =
          typeof toIndex === "number" && toIndex >= 0
            ? Math.min(toIndex, columns[toColumn].length)
            : columns[toColumn].length;
        columns[toColumn].splice(idx, 0, taskId);
        return {
          ...b,
          columns,
          tasks: { ...b.tasks, [taskId]: { ...existing, status: toColumn } },
        };
      });
    },
    [updateBoard],
  );

  /* ---------- tags ---------- */
  const allTags = useMemo(() => config.allTags ?? [], [config.allTags]);

  const addTag = useCallback(
    (tag: Tag): { exists: boolean; tag: Tag } => {
      const existing = configRef.current.allTags.find(
        (t) => t.name.toLowerCase() === tag.name.trim().toLowerCase(),
      );
      if (existing) return { exists: true, tag: existing };
      const clean: Tag = { ...tag, name: tag.name.trim() };
      saveConfig({ ...configRef.current, allTags: [...configRef.current.allTags, clean] });
      return { exists: false, tag: clean };
    },
    [saveConfig],
  );

  /** Colors only — tag names are immutable. Propagates to every task. */
  const updateTagColors = useCallback(
    (name: string, color: string, textColor: string) => {
      saveConfig({
        ...configRef.current,
        allTags: configRef.current.allTags.map((t) => (t.name === name ? { ...t, color, textColor } : t)),
      });
      const b = boardRef.current;
      const tasks: Record<string, Task> = {};
      Object.entries(b.tasks).forEach(([id, task]) => {
        tasks[id] = {
          ...task,
          tags: task.tags.map((t) => (t.name === name ? { ...t, color, textColor } : t)),
        };
      });
      saveBoard({ ...b, tasks });
    },
    [saveBoard, saveConfig],
  );

  const deleteTag = useCallback(
    (name: string) => {
      saveConfig({
        ...configRef.current,
        allTags: configRef.current.allTags.filter((t) => t.name !== name),
      });
      const b = boardRef.current;
      const tasks: Record<string, Task> = {};
      Object.entries(b.tasks).forEach(([id, task]) => {
        tasks[id] = { ...task, tags: task.tags.filter((t) => t.name !== name) };
      });
      saveBoard({ ...b, tasks });
    },
    [saveBoard, saveConfig],
  );

  /* ---------- import / export ---------- */
  const exportData = useCallback(() => {
    const payload = {
      version: "v6",
      exportDate: new Date().toISOString(),
      board: boardRef.current,
      config: configRef.current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `task-board-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const importData = useCallback(
    (file: File): Promise<ImportResult> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = validateImport(String(reader.result));
          if (result.ok && result.board && result.config) {
            saveBoard(result.board);
            saveConfig(result.config);
          }
          resolve(result);
        };
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsText(file);
      }),
    [saveBoard, saveConfig],
  );


  return {
    board,
    config,
    allTags,
    isLoaded,
    setTheme,
    setBackground,
    addCustomTheme,
    removeCustomTheme,
    setColumnColor,
    createTask,
    editTask,
    deleteTask,
    restoreTasks,
    purgeTasks,
    moveTask,
    addTag,
    updateTagColors,
    deleteTag,
    exportData,
    importData,
  };
};
