/**
 * User-uploaded CSS themes.
 * A theme file must declare metadata in a comment and style the `.theme-custom`
 * class (the class the app puts on <html> while that theme is selected).
 * Everything is validated + sanitised before it is ever injected.
 */

export interface CustomTheme {
  id: string;
  name: string;
  description: string;
  css: string;
}

export const MAX_NAME = 50;
export const MAX_DESC = 50;
const MAX_BYTES = 60_000;

const FORBIDDEN: { re: RegExp; msg: string }[] = [
  { re: /@import\b/i, msg: "@import is not allowed (external resources are blocked)." },
  {
    re: /<\s*\/?\s*(script|style|iframe|html)\b/i,
    msg: "HTML tags are not allowed inside a theme.",
  },
  { re: /javascript\s*:/i, msg: "javascript: URLs are not allowed." },
  { re: /expression\s*\(/i, msg: "CSS expression() is not allowed." },
  { re: /-moz-binding/i, msg: "-moz-binding is not allowed." },
  { re: /behavior\s*:/i, msg: "behavior: is not allowed." },
  {
    re: /url\(\s*['"]?\s*(?!data:image\/)/i,
    msg: "Only url(data:image/...) is allowed — no remote assets.",
  },
  { re: /@charset/i, msg: "@charset is not allowed." },
];

export const THEME_TEMPLATE = `/*
  @name: My Theme
  @description: Short line shown under the name

  Rules:
  - name and description: max 50 characters each
  - style the .theme-custom selector (the app adds it to <html>)
  - no @import, no remote url(), no scripts. url(data:image/...) is fine.
  - you can add your own @keyframes and animations
*/

.theme-custom {
  /* radius + shadows */
  --radius: 0.75rem;
  --shadow-card-value: 0 1px 2px rgb(0 0 0 / 0.12), 0 10px 24px -14px rgb(0 0 0 / 0.4);
  --shadow-float-value: 0 28px 70px -22px rgb(0 0 0 / 0.6);

  /* surfaces */
  --background: #0e1220;
  --foreground: #e8ecf8;
  --card: #171d31;
  --card-foreground: #e8ecf8;
  --elevated: #1d2438;
  --popover: #171d31;
  --popover-foreground: #e8ecf8;

  /* brand */
  --primary: #7aa2ff;
  --primary-foreground: #0e1220;
  --primary-soft: #26314f;

  --secondary: #1d2438;
  --secondary-foreground: #e8ecf8;
  --muted: #1d2438;
  --muted-foreground: #9aa5c4;
  --accent: #26314f;
  --accent-foreground: #eaf0ff;

  --destructive: #ff5d5d;
  --destructive-foreground: #ffffff;
  --destructive-soft: #3a1d22;

  --border: #2a3350;
  --input: #2a3350;
  --ring: #7aa2ff;

  /* badge colors */
  --success-soft: #12301f;
  --success-strong: #7ee2a8;
  --warning-soft: #33280f;
  --warning-strong: #ffd479;
  --danger-soft: #351a1d;
  --danger-strong: #ff9b9b;
  --info-soft: #16263f;
  --info-strong: #9cc4ff;
}

/* optional: your own effects and animations */
.theme-custom section,
.theme-custom .surface-panel {
  animation: theme-rise 0.4s ease both;
}

@keyframes theme-rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
`;

export interface ParseResult {
  ok: boolean;
  errors: string[];
  theme?: CustomTheme;
}

const readMeta = (src: string, key: string): string | null => {
  const m = new RegExp(`@${key}\\s*:\\s*([^\\n*]+)`, "i").exec(src);
  return m ? m[1]!.trim() : null;
};

const bracesBalanced = (src: string) => {
  let depth = 0;
  for (const ch of src) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
};

export const parseThemeCss = (raw: string): ParseResult => {
  const errors: string[] = [];
  const src = (raw ?? "").replace(/\r\n/g, "\n");

  if (!src.trim()) return { ok: false, errors: ["The file is empty."] };
  if (src.length > MAX_BYTES) errors.push(`Theme is too large (max ${MAX_BYTES / 1000}KB).`);

  const name = readMeta(src, "name");
  const description = readMeta(src, "description");

  if (!name) errors.push("Missing `@name:` in the header comment.");
  else if (name.length > MAX_NAME)
    errors.push(`Name is ${name.length} characters (max ${MAX_NAME}).`);

  if (!description) errors.push("Missing `@description:` in the header comment.");
  else if (description.length > MAX_DESC)
    errors.push(`Description is ${description.length} characters (max ${MAX_DESC}).`);

  if (!/\.theme-custom\b/.test(src))
    errors.push("No `.theme-custom` rule found — the theme would not apply to anything.");

  if (!bracesBalanced(src)) errors.push("Unbalanced { } braces — the CSS is not valid.");

  FORBIDDEN.forEach(({ re, msg }) => {
    if (re.test(src)) errors.push(msg);
  });

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    theme: {
      id: `custom:${Date.now().toString(36)}${Math.floor(Math.random() * 900 + 100)}`,
      name: name!.slice(0, MAX_NAME),
      description: description!.slice(0, MAX_DESC),
      css: src,
    },
  };
};

export const downloadThemeTemplate = () => {
  const blob = new Blob([THEME_TEMPLATE], { type: "text/css" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "task-board-theme-template.css";
  a.click();
  URL.revokeObjectURL(url);
};
