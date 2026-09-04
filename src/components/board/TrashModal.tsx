import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import type { Task } from "@/types/board";
import { COLUMNS } from "@/types/board";
import { priorityBadgeClass } from "@/lib/board-helpers";

interface TrashModalProps {
  tasks: Task[];
  onRestore: (ids: string[]) => void;
  onPurge: (ids: string[]) => void;
  onClose: () => void;
}

const label = (status: string) => COLUMNS.find((c) => c.key === status)?.label ?? status;

export const TrashModal = ({ tasks, onRestore, onPurge, onClose }: TrashModalProps) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allSelected = tasks.length > 0 && selected.length === tasks.length;
  const act = (fn: (ids: string[]) => void) => {
    const ids = selected.length ? selected : [];
    if (!ids.length) return;
    fn(ids);
    setSelected([]);
  };

  return (
    <Modal
      title={`Trash (${tasks.length})`}
      onClose={onClose}
      baseWidth={600}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-ghost"
            disabled={!selected.length}
            onClick={() => act(onRestore)}
            style={{ opacity: selected.length ? 1 : 0.5 }}
          >
            <RotateCcw size={15} /> Restore ({selected.length})
          </button>
          <button
            className="btn-danger"
            disabled={!selected.length}
            onClick={() => act(onPurge)}
            style={{ opacity: selected.length ? 1 : 0.5 }}
          >
            <Trash2 size={15} /> Delete forever
          </button>
        </>
      }
    >
      {tasks.length ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? [] : tasks.map((t) => t.id))}
                className="size-4 accent-[var(--color-primary)]"
              />
              Select all
            </label>
            <button className="text-xs font-semibold text-primary" onClick={() => onPurge(tasks.map((t) => t.id))}>
              Empty trash
            </button>
          </div>

          {tasks.map((task) => (
            <label
              key={task.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                selected.includes(task.id) ? "border-primary bg-primary-soft/60" : "border-border bg-elevated"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(task.id)}
                onChange={() => toggle(task.id)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold break-words">{task.title}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold uppercase ${priorityBadgeClass(task.priority)}`}
                  >
                    {task.priority}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {label(task.status)}
                  {task.deletedAt ? ` · deleted ${new Date(task.deletedAt).toLocaleDateString()}` : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <div className="grid place-items-center gap-2 py-12 text-center">
          <Trash2 size={28} className="text-muted-foreground" />
          <p className="text-sm font-semibold">Trash is empty</p>
          <p className="text-xs text-muted-foreground">Deleted tasks land here so you can restore them.</p>
        </div>
      )}
    </Modal>
  );
};
