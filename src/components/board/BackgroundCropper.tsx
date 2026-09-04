import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";

interface Props {
  src: string;
  /** Aspect ratio the crop must keep (screen shape). */
  aspect: number;
  onApply: (dataUrl: string) => void;
  onClose: () => void;
}

interface Box {
  x: number;
  y: number;
  w: number;
}

const MIN_W = 60;

/** Crop box keeps the screen aspect ratio and can never leave the image bounds. */
export const BackgroundCropper = ({ src, aspect, onApply, onClose }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0 });
  const drag = useRef<{ mode: "move" | "resize"; x: number; y: number; box: Box } | null>(null);

  const boxH = box.w / aspect;

  const fit = () => {
    const el = imgRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setSize({ w, h });
    const bw = Math.min(w, h * aspect);
    setBox({ x: (w - bw) / 2, y: (h - bw / aspect) / 2, w: bw });
  };

  useEffect(() => {
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clamp = (b: Box): Box => {
    const maxW = Math.min(size.w, size.h * aspect);
    const w = Math.max(MIN_W, Math.min(maxW, b.w));
    const h = w / aspect;
    return {
      w,
      x: Math.max(0, Math.min(size.w - w, b.x)),
      y: Math.max(0, Math.min(size.h - h, b.y)),
    };
  };

  const onDown = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { mode, x: e.clientX, y: e.clientY, box };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.mode === "move") setBox(clamp({ ...d.box, x: d.box.x + dx, y: d.box.y + dy }));
    else setBox(clamp({ ...d.box, w: d.box.w + Math.max(dx, dy * aspect) }));
  };

  const onUp = () => {
    drag.current = null;
  };

  const apply = () => {
    const el = imgRef.current;
    if (!el) return;
    const scale = el.naturalWidth / size.w;
    const outW = Math.min(1920, Math.round(box.w * scale));
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(el, box.x * scale, box.y * scale, box.w * scale, boxH * scale, 0, 0, outW, outH);
    onApply(canvas.toDataURL("image/jpeg", 0.85));
  };

  return (
    <Modal
      title="Choose the area to use"
      onClose={onClose}
      baseWidth={620}
      sizeKey="cropper"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={apply} disabled={!box.w}>
            Use this area
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Drag the box to move it, or drag its bottom-right corner to resize. It always keeps your
          screen&apos;s shape and stays inside the image.
        </p>
        <div
          ref={wrapRef}
          className="relative select-none overflow-hidden rounded-xl border border-border bg-elevated"
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt="Background to crop"
            onLoad={fit}
            draggable={false}
            className="block max-h-[50vh] w-full object-contain"
          />
          {box.w ? (
            <>
              <div className="pointer-events-none absolute inset-0 bg-black/50" />
              <div
                onPointerDown={onDown("move")}
                style={{ left: box.x, top: box.y, width: box.w, height: boxH }}
                className="absolute cursor-move touch-none rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0)] ring-2 ring-primary"
              >
                <div className="absolute inset-0 overflow-hidden rounded-md">
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    style={{
                      position: "absolute",
                      left: -box.x,
                      top: -box.y,
                      width: size.w,
                      height: size.h,
                      maxWidth: "none",
                    }}
                  />
                </div>
                <span
                  onPointerDown={onDown("resize")}
                  className="absolute -bottom-2 -right-2 size-5 cursor-nwse-resize touch-none rounded-full border-2 border-background bg-primary"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};
