import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  HelpCircle,
  ListFilter,
  Plus,
  Search,
  Settings,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Tag } from "@/types/board";

interface TopBarProps {
  search: string;
  onSearch: (v: string) => void;
  priority: string;
  onPriority: (v: string) => void;
  tagFilter: string[];
  onTagFilter: (v: string[]) => void;
  allTags: Tag[];
  onAddTask: () => void;
  onSettings: () => void;
  onTrash: () => void;
  onHelp: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  trashCount: number;
}

const PRIORITIES = [
  { value: "", label: "All priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function Dropdown({
  label,
  icon,
  active,
  align = "left",
  children,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  align?: "left" | "right";
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-[2.375rem] items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${
          active
            ? "border-primary bg-primary-soft text-primary"
            : "border-border bg-elevated text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div
          className={`absolute z-50 mt-2 max-h-72 w-56 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-float animate-slide-down ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

const menuItemClass = (selected: boolean) =>
  `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
    selected ? "bg-primary-soft text-primary" : "hover:bg-accent hover:text-accent-foreground"
  }`;

export const TopBar = ({
  search,
  onSearch,
  priority,
  onPriority,
  tagFilter,
  onTagFilter,
  allTags,
  onAddTask,
  onSettings,
  onTrash,
  onHelp,
  onExport,
  onImport,
  trashCount,
}: TopBarProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-3 py-2.5 sm:px-5 sm:py-3">
        {/* Row 1 — new task, search, settings, help */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAddTask}
            className="btn-primary h-[2.375rem] shrink-0 px-3 shadow-card"
            title="Add new task"
          >
            <Plus size={18} strokeWidth={2.6} />
            <span className="hidden md:inline">New task</span>
          </button>

          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search tasks, tags, notes…"
              className="field h-[2.375rem] pl-9 pr-9"
              aria-label="Search tasks"
            />
            {search ? (
              <button
                onClick={() => onSearch("")}
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <button onClick={onSettings} className="icon-button shrink-0" title="Settings">
            <Settings size={17} />
          </button>
          <button onClick={onHelp} className="icon-button shrink-0" title="Help & formatting">
            <HelpCircle size={17} />
          </button>
        </div>

        {/* Row 2 — filters and data actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Dropdown label="Priority" icon={<ListFilter size={16} />} active={!!priority}>
            {(close) =>
              PRIORITIES.map((p) => (
                <button
                  key={p.value || "all"}
                  className={menuItemClass(priority === p.value)}
                  onClick={() => {
                    onPriority(p.value);
                    close();
                  }}
                >
                  {p.label}
                </button>
              ))
            }
          </Dropdown>

          <Dropdown label="Tags" icon={<Tags size={16} />} active={tagFilter.length > 0}>
            {() => (
              <>
                <button
                  className={menuItemClass(!tagFilter.length)}
                  onClick={() => onTagFilter([])}
                >
                  All tags
                </button>
                {allTags.length ? (
                  allTags.map((t) => {
                    const selected = tagFilter.includes(t.name);
                    return (
                      <button
                        key={t.name}
                        className={menuItemClass(selected)}
                        onClick={() =>
                          onTagFilter(
                            selected
                              ? tagFilter.filter((n) => n !== t.name)
                              : [...tagFilter, t.name],
                          )
                        }
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="grid size-4 shrink-0 place-items-center rounded border border-border">
                            {selected ? <Check size={12} /> : null}
                          </span>
                          <span className="truncate">{t.name}</span>
                        </span>
                        <span
                          className="size-3.5 shrink-0 rounded-full border border-border"
                          style={{ backgroundColor: t.color }}
                        />
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No tags yet</p>
                )}
              </>
            )}
          </Dropdown>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button onClick={onTrash} className="icon-button relative" title="Trash">
              <Trash2 size={17} />
              {trashCount ? (
                <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[0.6rem] font-bold text-destructive-foreground">
                  {trashCount}
                </span>
              ) : null}
            </button>
            <button onClick={onExport} className="icon-button" title="Download board data">
              <Download size={17} />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="icon-button"
              title="Upload board data"
            >
              <Upload size={17} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {tagFilter.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {tagFilter.map((name) => {
              const tag = allTags.find((t) => t.name === name);
              return (
                <span
                  key={name}
                  style={tag ? { backgroundColor: tag.color, color: tag.textColor } : undefined}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[0.7rem] font-semibold text-primary"
                >
                  {name}
                  <button
                    onClick={() => onTagFilter(tagFilter.filter((n) => n !== name))}
                    aria-label={`Remove ${name} filter`}
                    className="opacity-70 transition-opacity hover:opacity-100"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </header>
  );
};
