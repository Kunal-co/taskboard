import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  heading?: string;
  items: MenuItem[];
  onClose: () => void;
}

export const ContextMenu = ({ x, y, heading, items, onClose }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + r.width > window.innerWidth) left = Math.max(8, window.innerWidth - r.width - 8);
    if (top + r.height > window.innerHeight) top = Math.max(8, window.innerHeight - r.height - 8);
    setPos({ left, top });
  }, [x, y]);

  useEffect(() => {
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", close);
      document.addEventListener("touchstart", close);
      window.addEventListener("scroll", onClose, true);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      window.removeEventListener("scroll", onClose, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-[60] min-w-44 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-float animate-slide-down"
    >
      {heading ? (
        <p className="px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
          {heading}
        </p>
      ) : null}
      {items.map((item) => (
        <button
          key={item.key}
          disabled={item.disabled}
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            item.danger
              ? "text-destructive hover:bg-destructive-soft"
              : "hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
};
