import type { CustomTheme } from "@/lib/theme-css";

export type Priority = "low" | "medium" | "high";
export type ColumnKey = "todo" | "inprogress" | "done";
/** Built-in theme ids, or a "custom:xxx" id from an uploaded CSS theme. */
export type ThemeName = string;

export const BUILTIN_THEMES: { id: string; name: string; description: string }[] = [
  { id: "light", name: "Light", description: "Bright and airy" },
  { id: "dark", name: "Dark", description: "Soft slate greys" },
  { id: "midnight", name: "Midnight", description: "Deep blue-black" },
  { id: "glass", name: "Liquid Glass", description: "Frosted glass over your background" },
];

export interface Tag {
  name: string;
  color: string;
  textColor: string;
}

export interface Task {
  id: string;
  title: string;
  desc: string;
  priority: Priority;
  tags: Tag[];
  due: string;
  status: ColumnKey;
  deleted: boolean;
  deletedAt: number | null;
}

export interface Board {
  columnOrder: ColumnKey[];
  columns: Record<ColumnKey, string[]>;
  tasks: Record<string, Task>;
}

export interface Config {
  theme: ThemeName;
  colColors: Record<ColumnKey, string>;
  tagColors: Record<string, string>;
  tagTextColors: Record<string, string>;
  allTags: Tag[];
  /** Uploaded CSS themes, kept so they stay in the dropdown. */
  customThemes: CustomTheme[];
  /** Cropped background image as a data URL. */
  background: string | null;
}

export interface DragState {
  taskId: string | null;
  fromCol: ColumnKey | null;
  targetCol: ColumnKey | null;
  targetIdx: number | null;
  height: number;
}

export const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "inprogress", label: "In Progress" },
  { key: "done", label: "Done" },
];
