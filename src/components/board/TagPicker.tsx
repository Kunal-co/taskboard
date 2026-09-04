import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Tag } from "@/types/board";
import { getContrastColor } from "@/lib/board-helpers";

interface TagPickerProps {
  tags: Tag[];
  allTags: Tag[];
  onChange: (tags: Tag[]) => void;
  /** Registers a tag globally; reports whether that name already existed. */
  onAddTag: (tag: Tag) => { exists: boolean; tag: Tag };
}

export const TagPicker = ({ tags, allTags, onChange, onAddTag }: TagPickerProps) => {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#5b8def");
  const [textColor, setTextColor] = useState("#ffffff");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const available = useMemo(
    () => allTags.filter((t) => !tags.some((x) => x.name === t.name)),
    [allTags, tags],
  );

  const trimmed = name.trim();
  const duplicate = useMemo(
    () => allTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase()) ?? null,
    [allTags, trimmed],
  );
  const canCreate = !!trimmed && !duplicate;

  const attach = (tag: Tag) => {
    if (!tags.some((t) => t.name === tag.name)) onChange([...tags, tag]);
  };

  const reset = () => {
    setName("");
    setColor("#5b8def");
    setTextColor("#ffffff");
    setCreating(false);
  };

  const create = () => {
    if (!canCreate) return;
    const { tag } = onAddTag({ name: trimmed, color, textColor });
    attach(tag);
    reset();
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.name}
            style={{ backgroundColor: tag.color, color: tag.textColor }}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t.name !== tag.name))}
              aria-label={`Remove ${tag.name}`}
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Add tag"
            title="Add tag"
            className="grid size-7 place-items-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus size={14} />
          </button>

          {open ? (
            <div className="absolute left-0 z-50 mt-2 w-72 rounded-xl border border-border bg-popover p-2 shadow-float animate-slide-down">
              {creating ? (
                <div className="flex flex-col gap-3 p-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Tag name
                    </span>
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. design"
                      className="field h-9"
                    />
                    {duplicate ? (
                      <div className="flex flex-col gap-1.5 pt-1">
                        <p className="text-xs font-semibold text-destructive">
                          A tag named “{duplicate.name}” already exists.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            attach(duplicate);
                            reset();
                            setOpen(false);
                          }}
                          className="btn-ghost h-8 self-start px-2 text-xs"
                        >
                          Use the existing tag
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1.5">
                      <span className="text-xs font-semibold">Tag color</span>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                          setColor(e.target.value);
                          setTextColor(getContrastColor(e.target.value));
                        }}
                        aria-label="Tag color"
                        className="h-7 w-10 rounded border border-input bg-elevated p-0.5"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1.5">
                      <span className="text-xs font-semibold">Text</span>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        aria-label="Text color"
                        className="h-7 w-10 rounded border border-input bg-elevated p-0.5"
                      />
                    </label>
                  </div>

                  <div className="grid place-items-center rounded-lg border border-border bg-elevated py-3">
                    <span
                      style={{ backgroundColor: color, color: textColor }}
                      className="min-w-12 rounded-full px-3 py-1 text-center text-xs font-bold"
                    >
                      {trimmed}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={reset}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!canCreate}
                      onClick={create}
                      className="btn-primary h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Create tag
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="px-2 pb-1 pt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Existing tags
                  </p>
                  <div className="max-h-48 overflow-y-auto">
                    {available.length ? (
                      available.map((tag) => (
                        <button
                          key={tag.name}
                          type="button"
                          onClick={() => {
                            attach(tag);
                            setOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <span
                            className="size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="truncate">{tag.name}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-1.5 text-sm text-muted-foreground">No other tags yet</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-2 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent"
                  >
                    <Plus size={14} /> Create new tag
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      {!tags.length ? (
        <p className="text-xs text-muted-foreground">No tags yet — use + to add one.</p>
      ) : null}
    </div>
  );
};
