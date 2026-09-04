import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { TagPicker } from "./TagPicker";
import type { ColumnKey, Priority, Tag, Task } from "@/types/board";
import { COLUMNS } from "@/types/board";

interface TaskModalProps {
  task: Task | null;
  defaultStatus: ColumnKey;
  allTags: Tag[];
  onAddTag: (tag: Tag) => { exists: boolean; tag: Tag };
  onSave: (data: Omit<Task, "id" | "deleted" | "deletedAt">) => void;
  onClose: () => void;
}

const PRIORITIES: Priority[] = ["low", "medium", "high"];

export const TaskModal = ({
  task,
  defaultStatus,
  allTags,
  onAddTag,
  onSave,
  onClose,
}: TaskModalProps) => {
  const [title, setTitle] = useState(task?.title ?? "");
  const [desc, setDesc] = useState(task?.desc ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [due, setDue] = useState(task?.due ?? "");
  const [status, setStatus] = useState<ColumnKey>(task?.status ?? defaultStatus);
  const [tags, setTags] = useState<Tag[]>(task?.tags ?? []);



  const submit = () => {
    if (!title.trim()) {
      toast.error("A task needs a title.");
      return;
    }
    onSave({ title: title.trim(), desc, priority, due, status, tags });
    onClose();
  };

  return (
    <Modal
      title={task ? "Edit task" : "New task"}
      onClose={onClose}
      baseWidth={620}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            {task ? "Save changes" : "Create task"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="What needs doing?"
            className="field"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Notes <span className="font-medium normal-case">(markdown supported)</span>
          </span>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={5}
            placeholder="**bold**, *italic*, `code`, ```py … ``` , > quote, [link](url)"
            className="field resize-y font-mono text-xs leading-relaxed"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="field"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p[0]!.toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Column</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ColumnKey)}
              className="field"
            >
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Due date</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="field" />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tags</span>
          <TagPicker tags={tags} allTags={allTags} onChange={setTags} onAddTag={onAddTag} />
        </div>

      </div>
    </Modal>
  );
};
