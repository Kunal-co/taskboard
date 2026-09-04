import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Base width in px; the panel never exceeds the device-safe cap. */
  baseWidth?: number;
  resizable?: boolean;
  /** Remembers the user's resized dimensions under this key. */
  sizeKey?: string;
}

const sizeStore = {
  key: (k: string) => `kanban:modalSize:${k}`,
  load(k: string): { w: number; h: number } | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(sizeStore.key(k));
      if (!raw) return null;
      const v = JSON.parse(raw);
      return typeof v?.w === "number" && typeof v?.h === "number" ? { w: v.w, h: v.h } : null;
    } catch {
      return null;
    }
  },
  save(k: string, size: { w: number; h: number }) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(sizeStore.key(k), JSON.stringify(size));
    } catch {
      /* storage full or blocked — sizing just won't persist */
    }
  },
};

const MIN_W = 300;
const MIN_H = 240;

export const Modal = ({
  title,
  onClose,
  children,
  footer,
  baseWidth = 560,
  resizable = true,
  sizeKey,
}: ModalProps) => {
  const persistKey = sizeKey ?? `w${baseWidth}`;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // Restore the remembered size after hydration so SSR markup stays stable.
  useEffect(() => {
    if (!resizable) return;
    const saved = sizeStore.load(persistKey);
    if (saved) setSize(saved);
  }, [persistKey, resizable]);
  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const caps = useCallback(() => {
    const maxW = Math.min(window.innerWidth - 24, 960);
    const maxH = Math.min(window.innerHeight - 32, 860);
    return { maxW, maxH };
  }, []);

  // Keep a user-resized panel inside bounds when the viewport changes.
  useEffect(() => {
    const onResize = () => {
      setSize((s) => {
        if (!s) return s;
        const { maxW, maxH } = caps();
        return { w: Math.min(s.w, maxW), h: Math.min(s.h, maxH) };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [caps]);

  const onHandleDown = (e: React.PointerEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onHandleMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const { maxW, maxH } = caps();
    const w = Math.max(MIN_W, Math.min(maxW, drag.current.w + (e.clientX - drag.current.x)));
    const h = Math.max(MIN_H, Math.min(maxH, drag.current.h + (e.clientY - drag.current.y)));
    setSize({ w, h });
  };

  const onHandleUp = () => {
    drag.current = null;
    if (size) sizeStore.save(persistKey, size);
  };

  const { maxW, maxH } = typeof window === "undefined" ? { maxW: 960, maxH: 860 } : caps();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-3 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-float animate-pop-in"
        style={{
          width: size ? size.w : Math.min(baseWidth, maxW),
          height: size ? size.h : undefined,
          maxWidth: maxW,
          maxHeight: maxH,
        }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-elevated px-5 py-3.5">
          <h2 className="flex min-w-0 items-center gap-2 truncate text-base font-bold">{title}</h2>
          <button onClick={onClose} className="icon-button size-8" aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-elevated px-5 py-3">
            {footer}
          </footer>
        ) : null}

        {resizable ? (
          <div
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            title="Drag to resize"
            className="absolute bottom-0 right-0 hidden h-5 w-5 cursor-nwse-resize touch-none items-end justify-end p-1 sm:flex"
          >
            <span className="block h-2.5 w-2.5 border-b-2 border-r-2 border-muted-foreground/70" />
          </div>
        ) : null}
      </div>
    </div>
  );
};
