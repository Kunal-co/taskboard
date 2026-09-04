import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Download, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { Modal } from "./Modal";
import { BackgroundCropper } from "./BackgroundCropper";
import {
  BUILTIN_THEMES,
  COLUMNS,
  type ColumnKey,
  type Config,
  type ThemeName,
} from "@/types/board";
import { DEFAULT_CONFIG, getContrastColor } from "@/lib/board-helpers";
import { downloadThemeTemplate, parseThemeCss, type CustomTheme } from "@/lib/theme-css";

interface SettingsModalProps {
  config: Config;
  onTheme: (theme: ThemeName) => void;
  onColumnColor: (col: ColumnKey, color: string) => void;
  onTagColors: (name: string, color: string, textColor: string) => void;
  onBackground: (dataUrl: string | null) => void;
  onAddTheme: (theme: CustomTheme) => void;
  onRemoveTheme: (id: string) => void;
  onClose: () => void;
}

/** Tag names are immutable here — only colors can be edited. */
function TagEditor({
  config,
  onTagColors,
}: {
  config: Config;
  onTagColors: (name: string, color: string, textColor: string) => void;
}) {
  const tags = config.allTags;
  const [selected, setSelected] = useState(tags[0]?.name ?? "");
  const current = tags.find((t) => t.name === selected) ?? tags[0];
  const [color, setColor] = useState(current?.color ?? "#5b8def");
  const [textColor, setTextColor] = useState(current?.textColor ?? "#ffffff");

  useEffect(() => {
    if (!current) return;
    setColor(current.color);
    setTextColor(current.textColor);
  }, [current?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tags.length) {
    return <p className="text-xs text-muted-foreground">No tags yet — create one from a task.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        aria-label="Tag to edit"
        className="field"
      >
        {tags.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-elevated px-3 py-2">
          <span className="text-sm font-semibold">Tag color</span>
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setTextColor(getContrastColor(e.target.value));
            }}
            className="h-9 w-16 rounded-md border border-input bg-card p-1"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-elevated px-3 py-2">
          <span className="text-sm font-semibold">Text color</span>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="h-9 w-16 rounded-md border border-input bg-card p-1"
          />
        </label>
      </div>

      <div className="grid place-items-center rounded-xl border border-border bg-elevated py-5">
        <span
          style={{ backgroundColor: color, color: textColor }}
          className="rounded-full px-4 py-1.5 text-sm font-bold"
        >
          {current?.name}
        </span>
      </div>

      <button
        className="btn-primary self-start"
        onClick={() => current && onTagColors(current.name, color, textColor)}
      >
        Apply to all tasks
      </button>
    </div>
  );
}

function ThemeDropdown({
  config,
  onTheme,
  onRemoveTheme,
}: {
  config: Config;
  onTheme: (t: ThemeName) => void;
  onRemoveTheme: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const all = [
    ...BUILTIN_THEMES.map((t) => ({ ...t, custom: false })),
    ...config.customThemes.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      custom: true,
    })),
  ];
  const current = all.find((t) => t.id === config.theme) ?? all[0]!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-elevated px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold">{current.name}</span>
          <span className="truncate text-xs text-muted-foreground">{current.description}</span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-float animate-slide-down">
          {all.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                t.id === config.theme
                  ? "bg-primary-soft text-primary"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <button
                onClick={() => {
                  onTheme(t.id);
                  setOpen(false);
                }}
                className="flex min-w-0 flex-1 flex-col text-left"
              >
                <span className="truncate text-sm font-bold">{t.name}</span>
                <span className="truncate text-xs text-muted-foreground">{t.description}</span>
              </button>
              {t.id === config.theme ? <Check size={14} className="shrink-0" /> : null}
              {t.custom ? (
                <button
                  onClick={() => onRemoveTheme(t.id)}
                  title="Delete this theme"
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const SettingsModal = ({
  config,
  onTheme,
  onColumnColor,
  onTagColors,
  onBackground,
  onAddTheme,
  onRemoveTheme,
  onClose,
}: SettingsModalProps) => {
  const bgInput = useRef<HTMLInputElement>(null);
  const cssInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [cssErrors, setCssErrors] = useState<string[]>([]);
  const [cssOk, setCssOk] = useState<string | null>(null);

  const pickBackground = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPending(String(reader.result));
    reader.readAsDataURL(file);
  };

  const pickTheme = (file?: File) => {
    if (!file) return;
    setCssOk(null);
    if (!/\.css$/i.test(file.name)) {
      setCssErrors(["Only .css theme files can be uploaded."]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseThemeCss(String(reader.result));
      if (result.ok && result.theme) {
        setCssErrors([]);
        setCssOk(`"${result.theme.name}" added and applied.`);
        onAddTheme(result.theme);
      } else {
        setCssErrors(result.errors);
      }
    };
    reader.readAsText(file);
  };

  const aspect =
    typeof window !== "undefined" && window.innerHeight > 0
      ? window.innerWidth / window.innerHeight
      : 16 / 9;

  return (
    <>
      <Modal
        title="Settings"
        onClose={onClose}
        baseWidth={520}
        sizeKey="settings"
        footer={
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        }
      >
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Theme
            </h3>
            <ThemeDropdown config={config} onTheme={onTheme} onRemoveTheme={onRemoveTheme} />

            <div className="mt-1 flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={downloadThemeTemplate}>
                <Download size={14} /> Get theme template
              </button>
              <button className="btn-ghost" onClick={() => cssInput.current?.click()}>
                <Upload size={14} /> Upload theme (.css)
              </button>
              <input
                ref={cssInput}
                type="file"
                accept=".css,text/css"
                hidden
                onChange={(e) => {
                  pickTheme(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>

            {cssErrors.length ? (
              <div className="rounded-xl border border-destructive bg-destructive-soft px-3 py-2 text-xs text-destructive">
                <p className="font-bold">That theme file was rejected:</p>
                <ul className="mt-1 list-disc pl-4">
                  {cssErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {cssOk ? (
              <p className="rounded-xl border border-border bg-success-soft px-3 py-2 text-xs text-success-strong">
                {cssOk}
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Background image
            </h3>
            {config.background ? (
              <div
                className="h-24 rounded-xl border border-border bg-cover bg-center"
                style={{ backgroundImage: `url("${config.background}")` }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                No background set — themes use their own colors.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => bgInput.current?.click()}>
                <ImageIcon size={14} /> {config.background ? "Change image" : "Upload image"}
              </button>
              {config.background ? (
                <button className="btn-ghost" onClick={() => onBackground(null)}>
                  <Trash2 size={14} /> Remove
                </button>
              ) : null}
              <input
                ref={bgInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  pickBackground(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Column colors
            </h3>
            <div className="flex flex-col gap-2">
              {COLUMNS.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-elevated px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: config.colColors[c.key] }}
                    />
                    <span className="truncate">{c.label}</span>
                  </span>
                  <input
                    type="color"
                    value={config.colColors[c.key]}
                    onChange={(e) => onColumnColor(c.key, e.target.value)}
                    aria-label={`${c.label} color`}
                    className="h-9 w-16 shrink-0 rounded-md border border-input bg-card p-1"
                  />
                </label>
              ))}
            </div>
            <button
              className="btn-ghost self-start"
              onClick={() =>
                COLUMNS.forEach((c) => onColumnColor(c.key, DEFAULT_CONFIG.colColors[c.key]))
              }
            >
              Reset column colors
            </button>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Edit tags
            </h3>
            <TagEditor config={config} onTagColors={onTagColors} />
          </section>
        </div>
      </Modal>

      {pending ? (
        <BackgroundCropper
          src={pending}
          aspect={aspect}
          onApply={(url) => {
            onBackground(url);
            setPending(null);
          }}
          onClose={() => setPending(null)}
        />
      ) : null}
    </>
  );
};
