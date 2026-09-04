import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Maximize2,
  Palette,
  Pencil,
  Filter,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "./TopBar";
import { Column } from "./Column";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { TaskModal } from "./TaskModal";
import { TagEditModal } from "./TagEditModal";
import { SettingsModal } from "./SettingsModal";
import { TrashModal } from "./TrashModal";
import { HelpModal } from "./HelpModal";
import { TaskViewModal } from "./TaskViewModal";
import { ImportErrorModal } from "./ImportErrorModal";
import { useBoardStore } from "@/hooks/useBoardStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { COLUMNS, type ColumnKey, type DragState, type Tag, type Task } from "@/types/board";
import { taskMatches } from "@/lib/board-helpers";
import type { ImportIssue } from "@/lib/import-validate";

type ModalState =
  | { kind: "task"; task: Task | null; status: ColumnKey }
  | { kind: "view"; task: Task }
  | { kind: "tag"; tag: Tag }
  | { kind: "settings" }
  | { kind: "trash" }
  | { kind: "help" }
  | { kind: "import"; fileName: string; ok: boolean; issues: ImportIssue[] }
  | null;

type MenuState =
  | { kind: "task"; task: Task; x: number; y: number }
  | { kind: "tag"; task: Task; tag: Tag; x: number; y: number }
  | null;

const COL_HEIGHT_KEY = "kanban:colHeight";
const MOBILE_COL_MIN = 220;
const MOBILE_COL_MAX = 620;
const MOBILE_COL_DEFAULT = 380;

const EMPTY_DRAG: DragState = {
  taskId: null,
  fromCol: null,
  targetCol: null,
  targetIdx: null,
  height: 0,
};

export const Board = () => {
  const store = useBoardStore();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [drag, setDrag] = useState<DragState>(EMPTY_DRAG);

  const filters = { search, priority, tags: tagFilter };
  const hasFilters = !!(search || priority || tagFilter.length);

  const columnTasks = useMemo(() => {
    const out = {} as Record<ColumnKey, Task[]>;
    COLUMNS.forEach(({ key }) => {
      out[key] = store.board.columns[key]
        .map((id) => store.board.tasks[id])
        .filter((t): t is Task => taskMatches(t, filters));
    });
    return out;
  }, [store.board, search, priority, tagFilter]);

  /* ---------- column height (mobile) ---------- */
  const [colHeight, setColHeight] = useState(MOBILE_COL_DEFAULT);
  useEffect(() => {
    const raw = Number(localStorage.getItem(COL_HEIGHT_KEY));
    if (raw) setColHeight(Math.min(MOBILE_COL_MAX, Math.max(MOBILE_COL_MIN, raw)));
  }, []);
  const commitColHeight = (h: number) => {
    const clamped = Math.min(MOBILE_COL_MAX, Math.max(MOBILE_COL_MIN, h));
    setColHeight(clamped);
    localStorage.setItem(COL_HEIGHT_KEY, String(clamped));
  };

  const trashed = useMemo(
    () =>
      Object.values(store.board.tasks)
        .filter((t) => t.deleted)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [store.board.tasks],
  );

  const visibleCount = COLUMNS.reduce((n, c) => n + columnTasks[c.key].length, 0);

  /* ---------- drag & drop ---------- */
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    const height = e.currentTarget.getBoundingClientRect().height;
    // Defer the state update so the browser keeps ownership of the drag source.
    setTimeout(() => {
      setDrag({
        taskId: task.id,
        fromCol: task.status,
        targetCol: null,
        targetIdx: null,
        height,
      });
    }, 0);
  };

  const onDragOverColumn = (col: ColumnKey, index: number) =>
    setDrag((d) =>
      d.targetCol === col && d.targetIdx === index ? d : { ...d, targetCol: col, targetIdx: index },
    );

  const onDragLeaveColumn = (col: ColumnKey) =>
    setDrag((d) => (d.targetCol === col ? { ...d, targetCol: null, targetIdx: null } : d));

  const onDropInColumn = (col: ColumnKey, index: number) => {
    if (drag.taskId) store.moveTask(drag.taskId, col, index);
    setDrag(EMPTY_DRAG);
  };

  const onDragEnd = () => setDrag(EMPTY_DRAG);

  /* ---------- actions ---------- */
  const handleDelete = (taskId: string) => {
    store.deleteTask(taskId);
    toast("Task moved to trash", {
      action: { label: "Undo", onClick: () => store.restoreTasks([taskId]) },
    });
  };

  const handleImport = async (file: File) => {
    try {
      const result = await store.importData(file);
      if (result.ok && !result.issues.length) {
        toast.success("Board restored from file");
        return;
      }
      setModal({ kind: "import", fileName: file.name, ok: result.ok, issues: result.issues });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not import that file");
    }
  };

  const moveIcon = (from: ColumnKey, to: ColumnKey) => {
    const back = COLUMNS.findIndex((c) => c.key === to) < COLUMNS.findIndex((c) => c.key === from);
    if (isMobile) return back ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    return back ? <ArrowLeft size={14} /> : <ArrowRight size={14} />;
  };

  const taskMenuItems = (task: Task): MenuItem[] => [
    {
      key: "expand",
      label: "Expand task",
      icon: <Maximize2 size={14} />,
      onSelect: () => setModal({ kind: "view", task }),
    },
    {
      key: "edit",
      label: "Edit task",
      icon: <Pencil size={14} />,
      onSelect: () => setModal({ kind: "task", task, status: task.status }),
    },
    ...COLUMNS.filter((c) => c.key !== task.status).map((c) => ({
      key: `move-${c.key}`,
      label: c.label,
      icon: moveIcon(task.status, c.key),
      onSelect: () => store.moveTask(task.id, c.key),
    })),
    {
      key: "delete",
      label: "Delete task",
      icon: <Trash2 size={14} />,
      danger: true,
      onSelect: () => handleDelete(task.id),
    },
  ];

  const tagMenuItems = (task: Task, tag: Tag): MenuItem[] => [
    {
      key: "filter",
      label: `Filter by "${tag.name}"`,
      icon: <Filter size={14} />,
      onSelect: () =>
        setTagFilter((prev) => (prev.includes(tag.name) ? prev : [...prev, tag.name])),
    },
    {
      key: "colors",
      label: "Change colors",
      icon: <Palette size={14} />,
      onSelect: () => setModal({ kind: "tag", tag }),
    },
    {
      key: "remove",
      label: "Remove from task",
      icon: <Trash2 size={14} />,
      danger: true,
      onSelect: () =>
        store.editTask(task.id, { tags: task.tags.filter((t) => t.name !== tag.name) }),
    },
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        search={search}
        onSearch={setSearch}
        priority={priority}
        onPriority={setPriority}
        tagFilter={tagFilter}
        onTagFilter={setTagFilter}
        allTags={store.allTags}
        onAddTask={() => setModal({ kind: "task", task: null, status: "todo" })}
        onSettings={() => setModal({ kind: "settings" })}
        onTrash={() => setModal({ kind: "trash" })}
        onHelp={() => setModal({ kind: "help" })}
        onExport={store.exportData}
        onImport={handleImport}
        trashCount={trashed.length}
      />

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-2 px-5 py-4 sm:px-8 sm:py-5">
          {hasFilters ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {visibleCount} task{visibleCount === 1 ? "" : "s"} match your filters
              </span>
              <button
                onClick={() => {
                  setSearch("");
                  setPriority("");
                  setTagFilter([]);
                }}
                className="font-bold text-primary"
              >
                Clear filters
              </button>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2 sm:flex-row sm:snap-x sm:snap-mandatory sm:gap-4 sm:overflow-x-auto sm:overflow-y-hidden">
            {COLUMNS.map(({ key, label }) => (
              <Column
                key={key}
                colKey={key}
                label={label}
                color={store.config.colColors[key]}
                tasks={columnTasks[key]}
                draggingId={drag.taskId}
                dropIndex={drag.targetCol === key ? drag.targetIdx : null}
                dragHeight={drag.height}
                onDragOverColumn={onDragOverColumn}
                onDragLeaveColumn={onDragLeaveColumn}
                onDropInColumn={onDropInColumn}
                onEdit={(task) => setModal({ kind: "task", task, status: task.status })}
                onDelete={handleDelete}
                onView={(task) => setModal({ kind: "view", task })}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onMenu={(task, x, y) => setMenu({ kind: "task", task, x, y })}
                onTagMenu={(task, tag, x, y) => setMenu({ kind: "tag", task, tag, x, y })}
                onAdd={(col) => setModal({ kind: "task", task: null, status: col })}
                height={isMobile ? colHeight : null}
                onResize={commitColHeight}
                minHeight={MOBILE_COL_MIN}
                maxHeight={MOBILE_COL_MAX}
              />
            ))}
          </div>

          {isMobile ? (
            <p className="shrink-0 text-center text-[0.7rem] text-muted-foreground sm:hidden">
              Scroll inside a list, or drag a list's bottom edge to resize it
            </p>
          ) : null}
        </div>
      </main>

      {menu?.kind === "task" ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          heading={menu.task.title}
          items={taskMenuItems(menu.task)}
          onClose={() => setMenu(null)}
        />
      ) : null}

      {menu?.kind === "tag" ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          heading={menu.tag.name}
          items={tagMenuItems(menu.task, menu.tag)}
          onClose={() => setMenu(null)}
        />
      ) : null}

      {modal?.kind === "task" ? (
        <TaskModal
          task={modal.task}
          defaultStatus={modal.status}
          allTags={store.allTags}
          onAddTag={store.addTag}
          onSave={(data) => {
            if (modal.task) store.editTask(modal.task.id, data);
            else store.createTask(data);
          }}
          onClose={() => setModal(null)}
        />
      ) : null}

      {modal?.kind === "view" ? (
        <TaskViewModal
          task={store.board.tasks[modal.task.id] ?? modal.task}
          onEdit={(task) => setModal({ kind: "task", task, status: task.status })}
          onClose={() => setModal(null)}
        />
      ) : null}

      {modal?.kind === "tag" ? (
        <TagEditModal
          tag={store.allTags.find((t) => t.name === modal.tag.name) ?? modal.tag}
          onSave={store.updateTagColors}
          onClose={() => setModal(null)}
        />
      ) : null}

      {modal?.kind === "settings" ? (
        <SettingsModal
          config={store.config}
          onTheme={store.setTheme}
          onColumnColor={store.setColumnColor}
          onTagColors={store.updateTagColors}
          onBackground={store.setBackground}
          onAddTheme={store.addCustomTheme}
          onRemoveTheme={store.removeCustomTheme}
          onClose={() => setModal(null)}
        />
      ) : null}

      {modal?.kind === "trash" ? (
        <TrashModal
          tasks={trashed}
          onRestore={(ids) => {
            store.restoreTasks(ids);
            toast.success(`Restored ${ids.length} task${ids.length === 1 ? "" : "s"}`);
          }}
          onPurge={(ids) => {
            store.purgeTasks(ids);
            toast.success(`Deleted ${ids.length} task${ids.length === 1 ? "" : "s"} permanently`);
          }}
          onClose={() => setModal(null)}
        />
      ) : null}

      {modal?.kind === "import" ? (
        <ImportErrorModal
          fileName={modal.fileName}
          ok={modal.ok}
          issues={modal.issues}
          onClose={() => setModal(null)}
        />
      ) : null}

      {modal?.kind === "help" ? <HelpModal onClose={() => setModal(null)} /> : null}
    </div>
  );
};
