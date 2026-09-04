import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, CalendarDays, Tag as TagIcon } from "lucide-react";
import type { Tag, Task } from "@/types/board";
import { dueBadgeClass, priorityBadgeClass, stripMarkdown } from "@/lib/board-helpers";

interface TaskCardProps {
  task: Task;
  isDragging: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onView: (task: Task) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragEnd: () => void;
  onMenu: (task: Task, x: number, y: number) => void;
  onTagMenu: (task: Task, tag: Tag, x: number, y: number) => void;
}

export const TaskCard = ({
  task,
  isDragging,
  onEdit,
  onDelete,
  onView,
  onDragStart,
  onDragEnd,
  onMenu,
  onTagMenu,
}: TaskCardProps) => {
  let lastTap = 0;

  const preview = task.desc ? stripMarkdown(task.desc) : "";
  const descRef = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const el = descRef.current;
    if (!el) {
      setClamped(false);
      return;
    }
    const measure = () => setClamped(el.scrollHeight - el.clientHeight > 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [preview]);

  return (
    <div
      data-card={isDragging ? undefined : ""}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(task, e.clientX, e.clientY);
      }}
      onDoubleClick={(e) => onMenu(task, e.clientX, e.clientY)}
      onTouchEnd={(e) => {
        const now = Date.now();
        if (now - lastTap < 400) {
          const t = e.changedTouches[0];
          onMenu(task, t?.clientX ?? 0, t?.clientY ?? 0);
          lastTap = 0;
        } else {
          lastTap = now;
        }
      }}
      style={isDragging ? { display: "none" } : undefined}
      className="group cursor-grab rounded-xl border border-border bg-card p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-float active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => onView(task)}
          className="min-w-0 flex-1 text-left text-sm font-semibold leading-snug break-words hover:text-primary"
        >
          {task.title}
        </button>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[0.68rem] font-bold uppercase ${priorityBadgeClass(task.priority)}`}
        >
          {task.priority}
        </span>
      </div>

      {preview ? (
        <div className="mt-1.5">
          <p ref={descRef} className="line-clamp-5 text-xs leading-relaxed text-muted-foreground">
            {preview}
          </p>
          {clamped ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(task);
              }}
              className="mt-0.5 text-xs font-semibold text-primary hover:underline"
            >
              Read more…
            </button>
          ) : null}
        </div>
      ) : null}

      {task.tags.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <TagIcon size={12} className="text-muted-foreground" />
          {task.tags.map((tag) => (
            <button
              key={tag.name}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTagMenu(task, tag, e.clientX, e.clientY);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onTagMenu(task, tag, e.clientX, e.clientY);
              }}
              style={{ backgroundColor: tag.color, color: tag.textColor }}
              className="rounded-full px-2 py-0.5 text-[0.68rem] font-semibold transition-transform hover:scale-105"
              title="Tag options"
            >
              {tag.name}
            </button>
          ))}
        </div>
      ) : null}

      {task.due ? (
        <div
          className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.7rem] font-semibold ${dueBadgeClass(task.due)}`}
        >
          <CalendarDays size={11} />
          {task.due}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2 opacity-90 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(task)}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary-soft px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <Pencil size={13} /> Edit
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-destructive-soft px-2 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
};
