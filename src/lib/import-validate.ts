import type { Board, ColumnKey, Config, Priority, Tag, Task } from "@/types/board";
import { DEFAULT_CONFIG, getContrastColor } from "./board-helpers";

export type IssueSeverity = "error" | "fixed";

export interface ImportIssue {
  line: number;
  column?: number | undefined;
  message: string;
  snippet?: string;
  severity: IssueSeverity;
}

export interface ImportResult {
  ok: boolean;
  board?: Board;
  config?: Config;
  issues: ImportIssue[];
}

const COL_KEYS: ColumnKey[] = ["todo", "inprogress", "done"];
const PRIORITIES: Priority[] = ["low", "medium", "high"];
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** 1-based line/column for a character offset. */
const posOf = (text: string, offset: number) => {
  const upto = text.slice(0, Math.max(0, offset));
  const lines = upto.split("\n");
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 };
};

const lineText = (text: string, line: number) => text.split("\n")[line - 1] ?? "";

/** Best-effort: find the line where a literal (e.g. a task id) first appears. */
const lineOfLiteral = (text: string, literal: string) => {
  const idx = text.indexOf(JSON.stringify(literal));
  if (idx < 0) return 1;
  return posOf(text, idx).line;
};

const lineOfKey = (text: string, key: string) => lineOfLiteral(text, key);

export const validateImport = (text: string): ImportResult => {
  const issues: ImportIssue[] = [];
  const add = (severity: IssueSeverity, line: number, message: string, column?: number) =>
    issues.push({ severity, line, column, message, snippet: lineText(text, line) });

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid JSON";
    const m = /position (\d+)/i.exec(msg);
    const { line, column } = m ? posOf(text, Number(m[1])) : { line: 1, column: 1 };
    add("error", line, `JSONDecodeError: ${msg.replace(/\s*in JSON at position.*/i, "")}`, column);
    return { ok: false, issues };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    add("error", 1, "ValueError: the file must contain a JSON object at the top level");
    return { ok: false, issues };
  }

  const root = parsed as Record<string, unknown>;
  const rawBoard = (root['board'] ?? root) as Record<string, unknown>;
  const rawTasks = rawBoard?.['tasks'];

  if (!rawTasks || typeof rawTasks !== "object" || Array.isArray(rawTasks)) {
    add("error", lineOfKey(text, "board"), "KeyError: 'board.tasks' is missing or is not an object");
    return { ok: false, issues };
  }

  /* ---------- tag registry (deduplicated, case-insensitive) ---------- */
  const registry = new Map<string, Tag>();
  const registerTag = (raw: unknown, where: string): Tag | null => {
    const value =
      typeof raw === "string"
        ? { name: raw, color: "#5b8def", textColor: "#ffffff" }
        : (raw as Partial<Tag> | null);
    const name = String(value?.name ?? "").trim();
    if (!name) {
      add("fixed", lineOfKey(text, "tags"), `ValueError: an unnamed tag in ${where} was dropped`);
      return null;
    }
    const key = name.toLowerCase();
    let color = String(value?.color ?? "#5b8def");
    if (!HEX.test(color)) {
      add("fixed", lineOfLiteral(text, name), `ValueError: tag '${name}' had an invalid color — reset to #5b8def`);
      color = "#5b8def";
    }
    let textColor = String(value?.textColor ?? "");
    if (!HEX.test(textColor)) textColor = getContrastColor(color);

    const existing = registry.get(key);
    if (existing) {
      if (existing.name !== name || existing.color !== color) {
        add(
          "fixed",
          lineOfLiteral(text, name),
          `DuplicateTag: '${name}' also exists as '${existing.name}' — merged into one tag`,
        );
      }
      return existing;
    }
    const tag: Tag = { name, color, textColor };
    registry.set(key, tag);
    return tag;
  };

  const rawConfig = (root['config'] ?? {}) as Partial<Config>;
  (rawConfig.allTags ?? []).forEach((t) => registerTag(t, "the tag list"));

  /* ---------- tasks ---------- */
  const tasks: Record<string, Task> = {};
  Object.entries(rawTasks as Record<string, unknown>).forEach(([id, value]) => {
    const line = lineOfLiteral(text, id);
    if (!value || typeof value !== "object") {
      add("fixed", line, `TypeError: task '${id}' is not an object — skipped`);
      return;
    }
    const t = value as Partial<Task>;
    let title = typeof t.title === "string" ? t.title.trim() : "";
    if (!title) {
      title = "Untitled task";
      add("fixed", line, `ValueError: task '${id}' has no title — renamed to 'Untitled task'`);
    }
    let status = t.status as ColumnKey;
    if (!COL_KEYS.includes(status)) {
      add("fixed", line, `ValueError: task '${id}' has unknown status '${String(t.status)}' — moved to Todo`);
      status = "todo";
    }
    let priority = t.priority as Priority;
    if (!PRIORITIES.includes(priority)) {
      if (t.priority !== undefined)
        add("fixed", line, `ValueError: task '${id}' has unknown priority '${String(t.priority)}' — set to medium`);
      priority = "medium";
    }
    let due = typeof t.due === "string" ? t.due : "";
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      add("fixed", line, `ValueError: task '${id}' has an invalid due date '${due}' — cleared`);
      due = "";
    }

    const seen = new Set<string>();
    const tags: Tag[] = [];
    (Array.isArray(t.tags) ? t.tags : []).forEach((raw) => {
      const tag = registerTag(raw, `task '${id}'`);
      if (!tag) return;
      const key = tag.name.toLowerCase();
      if (seen.has(key)) {
        add("fixed", line, `DuplicateTag: task '${id}' listed '${tag.name}' twice — kept one`);
        return;
      }
      seen.add(key);
      tags.push(tag);
    });

    tasks[id] = {
      id,
      title,
      desc: typeof t.desc === "string" ? t.desc : "",
      priority,
      tags,
      due,
      status,
      deleted: !!t.deleted,
      deletedAt: typeof t.deletedAt === "number" ? t.deletedAt : null,
    };
  });

  if (!Object.keys(tasks).length) {
    add("error", lineOfKey(text, "tasks"), "ValueError: the file contains no usable tasks");
    return { ok: false, issues };
  }

  /* ---------- columns ---------- */
  const rawColumns = (rawBoard['columns'] ?? {}) as Partial<Record<ColumnKey, unknown>>;
  const columns: Record<ColumnKey, string[]> = { todo: [], inprogress: [], done: [] };
  const placed = new Set<string>();

  COL_KEYS.forEach((key) => {
    const list = Array.isArray(rawColumns[key]) ? (rawColumns[key] as unknown[]) : [];
    list.forEach((raw) => {
      const id = String(raw);
      const task = tasks[id];
      if (!task) {
        add("fixed", lineOfLiteral(text, id), `KeyError: column '${key}' references unknown task '${id}' — removed`);
        return;
      }
      if (task.deleted) return;
      if (placed.has(id)) {
        add("fixed", lineOfLiteral(text, id), `DuplicateTask: '${id}' appeared in more than one column — kept once`);
        return;
      }
      if (task.status !== key) {
        add("fixed", lineOfLiteral(text, id), `ValueError: task '${id}' is listed in '${key}' but marked '${task.status}' — using '${key}'`);
        tasks[id] = { ...task, status: key };
      }
      placed.add(id);
      columns[key].push(id);
    });
  });

  Object.values(tasks).forEach((task) => {
    if (task.deleted || placed.has(task.id)) return;
    columns[task.status].push(task.id);
    placed.add(task.id);
  });

  /* ---------- config ---------- */
  const theme =
    typeof rawConfig.theme === "string" &&
    ["dark", "midnight", "glass", "light"].includes(rawConfig.theme)
      ? rawConfig.theme
      : "light";
  const colColors = { ...DEFAULT_CONFIG.colColors };
  COL_KEYS.forEach((key) => {
    const v = rawConfig.colColors?.[key];
    if (typeof v === "string" && HEX.test(v)) colColors[key] = v;
    else if (v !== undefined)
      add("fixed", lineOfKey(text, "colColors"), `ValueError: column color for '${key}' is invalid — reset to default`);
  });

  // Every tag used by a task must exist in the registry (already guaranteed above).
  const config: Config = {
    theme,
    colColors,
    tagColors: {},
    tagTextColors: {},
    allTags: [...registry.values()],
    customThemes: [],
    background: null,
  };

  return {
    ok: true,
    board: { columnOrder: COL_KEYS, columns, tasks },
    config,
    issues,
  };
};
