import { useRef } from "react";
import type { ColumnKey, Tag, Task } from "@/types/board";
import { TaskCard } from "./TaskCard";

interface ColumnProps {
  colKey: ColumnKey;
  label: string;
  color: string;
  tasks: Task[];
  draggingId: string | null;
  dropIndex: number | null;
  dragHeight: number;
  onDragOverColumn: (col: ColumnKey, index: number) => void;
  onDragLeaveColumn: (col: ColumnKey) => void;
  onDropInColumn: (col: ColumnKey, index: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onView: (task: Task) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragEnd: () => void;
  onMenu: (task: Task, x: number, y: number) => void;
  onTagMenu: (task: Task, tag: Tag, x: number, y: number) => void;
  onAdd: (col: ColumnKey) => void;
  /** Fixed pixel height (mobile stacked layout); null = fill available height. */
  height: number | null;
  onResize: (height: number) => void;
  minHeight: number;
  maxHeight: number;
}

export const Column = ({
  colKey,
  label,
  color,
  tasks,
  draggingId,
  dropIndex,
  dragHeight,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropInColumn,
  onEdit,
  onDelete,
  onView,
  onDragStart,
  onDragEnd,
  onMenu,
  onTagMenu,
  onAdd,
  height,
  onResize,
  minHeight,
  maxHeight,
}: ColumnProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const resizeStart = useRef<{ y: number; h: number } | null>(null);

  /** Index among the cards that stay visible while dragging. */
  const computeIndex = (clientY: number) => {
    const cards = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-card]") ?? []);
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i]!.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return cards.length;
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOverColumn(colKey, computeIndex(e.clientY));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDropInColumn(colKey, dropIndex ?? computeIndex(e.clientY));
  };

  const onResizeDown = (e: React.PointerEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    resizeStart.current = { y: e.clientY, h: rect.height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeStart.current) return;
    e.preventDefault();
    const next = resizeStart.current.h + (e.clientY - resizeStart.current.y);
    onResize(Math.min(maxHeight, Math.max(minHeight, next)));
  };

  const onResizeUp = () => {
    resizeStart.current = null;
  };

  const placeholder = (key: string) => (
    <div key={key} className="drop-placeholder" style={{ height: Math.max(64, dragHeight) }}>
      Drop here
    </div>
  );

  // The dragged card stays mounted (hidden) so the browser never cancels the drag.
  const items: React.ReactNode[] = [];
  let visibleIdx = 0;
  tasks.forEach((task) => {
    const isDragging = task.id === draggingId;
    if (!isDragging) {
      if (dropIndex === visibleIdx) items.push(placeholder(`ph-${visibleIdx}`));
      visibleIdx += 1;
    }
    items.push(
      <TaskCard
        key={task.id}
        task={task}
        isDragging={isDragging}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onMenu={onMenu}
        onTagMenu={onTagMenu}
      />,
    );
  });
  if (dropIndex !== null && dropIndex >= visibleIdx) items.push(placeholder("ph-end"));

  const hasVisibleCards = visibleIdx > 0;

  return (
    <section
      ref={sectionRef}
      style={
        height ? { height, borderTop: `4px solid ${color}` } : { borderTop: `4px solid ${color}` }
      }
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragLeaveColumn(colKey);
      }}
      onDrop={handleDrop}
      className={`flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-elevated shadow-card transition-shadow duration-200 sm:min-h-0 sm:w-[21rem] sm:snap-start ${
        dropIndex !== null ? "ring-2 ring-ring/60" : ""
      }`}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-2 px-4 py-3"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="truncate text-sm font-bold uppercase tracking-wide">{label}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full bg-card px-2 py-0.5 text-xs font-bold text-muted-foreground">
            {tasks.length}
          </span>
          <button
            onClick={() => onAdd(colKey)}
            className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            title={`Add task to ${label}`}
          >
            +
          </button>
        </div>
      </header>

      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain p-3"
      >
        {items}
        {!hasVisibleCards && dropIndex === null ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No tasks here yet</p>
        ) : null}
      </div>

      {height !== null ? (
        <div
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
          title="Drag to resize this list"
          className="flex h-5 shrink-0 cursor-ns-resize touch-none items-center justify-center border-t border-border bg-elevated"
        >
          <span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
        </div>
      ) : null}
    </section>
  );
};
