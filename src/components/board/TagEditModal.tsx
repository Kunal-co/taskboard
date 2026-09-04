import { useState } from "react";
import { Modal } from "./Modal";
import type { Tag } from "@/types/board";
import { getContrastColor } from "@/lib/board-helpers";

interface TagEditModalProps {
  tag: Tag;
  onSave: (name: string, color: string, textColor: string) => void;
  onClose: () => void;
}

/** Tag names are immutable — only the colors can change here. */
export const TagEditModal = ({ tag, onSave, onClose }: TagEditModalProps) => {
  const [color, setColor] = useState(tag.color);
  const [textColor, setTextColor] = useState(tag.textColor);

  return (
    <Modal
      title={`Tag colors — ${tag.name}`}
      onClose={onClose}
      baseWidth={420}
      resizable={false}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onSave(tag.name, color, textColor);
              onClose();
            }}
          >
            Apply colors
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid place-items-center rounded-xl border border-border bg-elevated py-6">
          <span
            style={{ backgroundColor: color, color: textColor }}
            className="rounded-full px-4 py-1.5 text-sm font-bold"
          >
            {tag.name}
          </span>
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Background</span>
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setTextColor(getContrastColor(e.target.value));
            }}
            className="h-9 w-16 rounded-md border border-input bg-elevated p-1"
          />
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Text</span>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="h-9 w-16 rounded-md border border-input bg-elevated p-1"
          />
        </label>

        <p className="text-xs text-muted-foreground">
          Tag names can’t be renamed — new colors apply to every task using this tag.
        </p>
      </div>
    </Modal>
  );
};
