import { CalendarDays, Pencil, Tag as TagIcon } from "lucide-react";
import { Modal } from "./Modal";
import type { Task } from "@/types/board";
import { COLUMNS } from "@/types/board";
import { dueBadgeClass, priorityBadgeClass } from "@/lib/board-helpers";
import { parseMarkdown } from "@/lib/markdown";

interface TaskViewModalProps {
  task: Task;
  onEdit: (task: Task) => void;
  onClose: () => void;
}

export const TaskViewModal = ({ task, onEdit, onClose }: TaskViewModalProps) => (
  <Modal
    title={task.title}
    onClose={onClose}
    baseWidth={640}
    footer={
      <>
        <button className="btn-ghost" onClick={onClose}>
          Close
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            onClose();
            onEdit(task);
          }}
        >
          <Pencil size={15} /> Edit task
        </button>
      </>
    }
  >
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[0.7rem] font-bold uppercase ${priorityBadgeClass(task.priority)}`}
        >
          {task.priority} priority
        </span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[0.7rem] font-bold uppercase text-muted-foreground">
          {COLUMNS.find((c) => c.key === task.status)?.label ?? task.status}
        </span>
        {task.due ? (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.7rem] font-bold ${dueBadgeClass(task.due)}`}
          >
            <CalendarDays size={11} /> {task.due}
          </span>
        ) : null}
      </div>

      {task.tags.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <TagIcon size={13} className="text-muted-foreground" />
          {task.tags.map((tag) => (
            <span
              key={tag.name}
              style={{ backgroundColor: tag.color, color: tag.textColor }}
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            >
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}

      {task.desc ? (
        <div
          className="md-body rounded-xl border border-border bg-elevated p-4"
          dangerouslySetInnerHTML={{ __html: parseMarkdown(task.desc) }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No notes on this task.</p>
      )}
    </div>
  </Modal>
);
