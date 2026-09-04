const LANG_KEYWORDS: Record<string, string[]> = {
  py: ["def","class","if","else","elif","for","while","return","import","from","as","try","except","finally","with","lambda","True","False","None","print","in","not","and","or"],
  js: ["function","const","let","var","if","else","for","while","return","class","new","this","async","await","import","export","from","true","false","null","undefined","typeof"],
  java: ["public","private","protected","class","interface","extends","implements","void","int","String","if","else","for","while","return","new","static","final","boolean"],
  cpp: ["include","using","namespace","int","float","double","char","void","if","else","for","while","return","class","struct","new","delete","const","bool","std"],
  html: ["html","head","body","div","p","span","a","img","script","style","meta","title","link","class","id"],
  css: ["color","background","padding","margin","font","border","width","height","display","flex","grid","position","transform"],
  text: [],
};

export const SUPPORTED_LANGS = Object.keys(LANG_KEYWORDS);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const highlight = (code: string, lang: string): string => {
  const language = LANG_KEYWORDS[lang] ? lang : "text";
  let out = escapeHtml(code);

  if (language === "py") {
    out = out.replace(/#[^\n]*/g, (m) => `<span class="tok-comment">${m}</span>`);
  } else if (["js", "java", "cpp", "css"].includes(language)) {
    out = out.replace(/\/\/[^\n]*/g, (m) => `<span class="tok-comment">${m}</span>`);
    out = out.replace(/\/\*[\s\S]*?\*\//g, (m) => `<span class="tok-comment">${m}</span>`);
  }

  out = out.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (m) =>
    m.includes("<span") ? m : `<span class="tok-string">${m}</span>`,
  );

  (LANG_KEYWORDS[language] ?? []).forEach((kw) => {
    out = out.replace(new RegExp(`\\b${kw}\\b(?![^<]*>)`, "g"), `<span class="tok-keyword">${kw}</span>`);
  });

  out = out.replace(/\b\d+(\.\d+)?\b(?![^<]*>)/g, (m) => `<span class="tok-number">${m}</span>`);
  out = out.replace(/\b([a-zA-Z_]\w*)(?=\s*\()(?![^<]*>)/g, '<span class="tok-fn">$1</span>');
  return out;
};

/**
 * Chat-style markdown -> HTML.
 * Fenced blocks are extracted first so their contents are never re-parsed.
 */
export const parseMarkdown = (text: string): string => {
  if (!text) return "";

  const blocks: string[] = [];
  const stash = (html: string) => {
    blocks.push(html);
    return `\u0000BLOCK${blocks.length - 1}\u0000`;
  };

  let result = text;

  // Colored blocks: ```{#ff0000} ... ```
  result = result.replace(
    /```\{(#[0-9A-Fa-f]{3,8}|[a-zA-Z]+)\}\n?([\s\S]*?)```/g,
    (_m, color: string, content: string) =>
      stash(
        `<span style="color:${/^#[0-9A-Fa-f]{3,8}$|^[a-zA-Z]+$/.test(color) ? color : "inherit"}">${escapeHtml(
          content.trim(),
        )}</span>`,
      ),
  );

  // Code blocks with optional language
  result = result.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_m, lang: string | undefined, code: string) => {
    const language = (lang || "text").toLowerCase();
    return stash(
      `<pre data-language="${language}"><code>${highlight(code.replace(/\n$/, ""), language)}</code></pre>`,
    );
  });

  // Inline code
  result = result.replace(/`([^`\n]+)`/g, (_m, code: string) => stash(`<code>${escapeHtml(code)}</code>`));

  result = escapeHtml(result);

  // Links
  result = result.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Bold, italic, strike
  result = result.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__([^_]+?)__/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+?)\*/g, "<em>$1</em>");
  result = result.replace(/(^|[^\w])_([^_]+?)_(?=[^\w]|$)/g, "$1<em>$2</em>");
  result = result.replace(/~~([^~]+?)~~/g, "<del>$1</del>");

  // Blockquote
  result = result.replace(/^&gt;\s?(.*)$/gm, "<blockquote>$1</blockquote>");

  result = result.replace(/\n/g, "<br>");
  result = result.replace(/<br>(?=<blockquote>)/g, "");

  // Restore fenced/inline blocks
  result = result.replace(/\u0000BLOCK(\d+)\u0000/g, (_m, i: string) => blocks[Number(i)] ?? "");
  return result;
};
