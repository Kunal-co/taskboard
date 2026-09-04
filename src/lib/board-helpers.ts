import type { Board, Config, Priority, Task } from "@/types/board";

export const DEFAULT_BOARD: Board = {
  columnOrder: ["todo", "inprogress", "done"],
  columns: { todo: [], inprogress: [], done: [] },
  tasks: {},
};

export const DEFAULT_CONFIG: Config = {
  theme: "light",
  colColors: {
    todo: "#5b8def",
    inprogress: "#f4a641",
    done: "#3fbf7f",
  },
  tagColors: {},
  tagTextColors: {},
  allTags: [],
  customThemes: [],
  background: null,
};

export const generateTaskId = (): string =>
  "T" + Date.now().toString(36).slice(-5) + Math.floor(Math.random() * 900 + 100);

export type DueKind = "past" | "today" | "soon" | "future" | "none";

export const getDueKind = (due: string): DueKind => {
  if (!due) return "none";
  const today = new Date().toISOString().slice(0, 10);
  if (due < today) return "past";
  if (due === today) return "today";
  const diff = new Date(due).getTime() - new Date(today).getTime();
  if (diff <= 3 * 24 * 60 * 60 * 1000) return "soon";
  return "future";
};

export const dueBadgeClass = (due: string): string => {
  switch (getDueKind(due)) {
    case "past":
      return "bg-danger-soft text-danger-strong";
    case "today":
      return "bg-warning-soft text-warning-strong";
    case "soon":
      return "bg-warning-soft text-warning-strong";
    case "future":
      return "bg-info-soft text-info-strong";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const priorityBadgeClass = (priority: Priority | string): string => {
  switch (priority) {
    case "low":
      return "bg-success-soft text-success-strong";
    case "medium":
      return "bg-warning-soft text-warning-strong";
    case "high":
      return "bg-danger-soft text-danger-strong";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const getContrastColor = (hexColor: string): string => {
  const hex = (hexColor || "#000000").replace("#", "");
  if (hex.length < 6) return "#ffffff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? "#111827" : "#ffffff";
};

export const stripMarkdown = (text: string): string =>
  text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_~`>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

export interface TaskFilters {
  search: string;
  priority: string;
  /** Selected tag names; a task matches when it carries any of them. */
  tags: string[];
}

export const taskMatches = (task: Task | undefined, f: TaskFilters): boolean => {
  if (!task || task.deleted) return false;
  const q = f.search.trim().toLowerCase();
  if (q) {
    const inTitle = task.title.toLowerCase().includes(q);
    const inDesc = task.desc.toLowerCase().includes(q);
    const inTags = task.tags?.some((t) => t.name.toLowerCase().includes(q));
    if (!inTitle && !inDesc && !inTags) return false;
  }
  if (f.priority && task.priority !== f.priority) return false;
  if (f.tags.length && !task.tags?.some((t) => f.tags.includes(t.name))) return false;
  return true;
};


/** Migrates older/partial saved data into the current shape. */
export const normalizeBoard = (raw: unknown): Board => {
  const b = raw as Partial<Board> | null;
  if (!b || typeof b !== "object" || !b.tasks) return DEFAULT_BOARD;
  const tasks: Record<string, Task> = {};
  Object.entries(b.tasks).forEach(([id, t]) => {
    const task = t as Task;
    if (!task) return;
    tasks[id] = {
      id,
      title: task.title ?? "Untitled",
      desc: task.desc ?? "",
      priority: (task.priority as Priority) ?? "medium",
      tags: (task.tags ?? [])
        .map((tag) =>
          typeof tag === "string"
            ? { name: tag, color: "#5b8def", textColor: "#ffffff" }
            : { name: tag.name, color: tag.color ?? "#5b8def", textColor: tag.textColor ?? "#ffffff" },
        )
        .filter((tag) => !!tag.name),
      due: task.due ?? "",
      status: (task.status as Task["status"]) ?? "todo",
      deleted: !!task.deleted,
      deletedAt: task.deletedAt ?? null,
    };
  });
  const cols = b.columns ?? DEFAULT_BOARD.columns;
  const pick = (key: keyof Board["columns"]) =>
    (cols[key] ?? []).filter((id) => tasks[id] && !tasks[id].deleted);
  return {
    columnOrder: ["todo", "inprogress", "done"],
    columns: { todo: pick("todo"), inprogress: pick("inprogress"), done: pick("done") },
    tasks,
  };
};

export const normalizeConfig = (raw: unknown): Config => {
  const c = raw as Partial<Config> | null;
  if (!c || typeof c !== "object") return DEFAULT_CONFIG;
  const customThemes = Array.isArray(c.customThemes)
    ? c.customThemes.filter((t) => t && t.id && t.name && typeof t.css === "string")
    : [];
  const ids = ["light", "dark", "midnight", "glass", ...customThemes.map((t) => t.id)];
  const theme = typeof c.theme === "string" && ids.includes(c.theme) ? c.theme : "light";
  return {
    theme,
    colColors: { ...DEFAULT_CONFIG.colColors, ...(c.colColors ?? {}) },
    tagColors: c.tagColors ?? {},
    tagTextColors: c.tagTextColors ?? {},
    allTags: (c.allTags ?? []).filter((t) => t && t.name),
    customThemes,
    background: typeof c.background === "string" ? c.background : null,
  };
};
