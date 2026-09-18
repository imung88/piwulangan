/**
 * @module lib/markdown
 * @overview Dependency-free lesson markdown renderer (escape-first, line-based).
 * @responsibilities
 *   - Parse a small Markdown subset into safe HTML for lesson bodies
 * @exports
 *   - `escapeHtml`
 *   - `renderMarkdown`
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeHref(escapedUrl: string): boolean {
  if (/\s/.test(escapedUrl)) return false;
  if (/^(https?:|mailto:)/i.test(escapedUrl)) return true;
  if (escapedUrl.startsWith("/") || escapedUrl.startsWith("#")) return true;
  return false;
}

/** Inline pass over already-escaped text. Code/link runs are stashed so other rules don't touch them. */
function renderInline(escaped: string): string {
  const slots: string[] = [];
  const stash = (html: string) => {
    const token = `@@MD${slots.length}@@`;
    slots.push(html);
    return token;
  };

  let s = escaped;

  s = s.replace(/`([^`]+)`/g, (_, code: string) => stash(`<code>${code}</code>`));

  s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, text: string, url: string) => {
    if (!isSafeHref(url)) return match;
    return stash(
      `<a href="${url}" rel="noopener noreferrer" target="_blank">${text}</a>`
    );
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

  s = s.replace(/@@MD(\d+)@@/g, (_, i: string) => slots[Number(i)] ?? "");
  return s;
}

function isBlockStart(line: string): boolean {
  return (
    /^#{1,6}\s+/.test(line) ||
    /^&gt;/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line)
  );
}

/**
 * Render a constrained Markdown subset to HTML.
 * Supports: h1-h3, bold, italic, inline code, links (http/https/mailto/#//),
 * blockquotes, unordered/ordered lists, paragraphs, single-newline breaks.
 */
export function renderMarkdown(md: string): string {
  if (!md) return "";

  const escaped = escapeHtml(md.replace(/\r\n?/g, "\n"));
  const lines = escaped.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^&gt;/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^&gt;/.test(lines[i])) {
        parts.push(renderInline(lines[i].replace(/^&gt;\s?/, "")));
        i++;
      }
      out.push(`<blockquote>${parts.join("<br>")}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(renderInline(lines[i].replace(/^[-*]\s+/, "")));
        i++;
      }
      out.push(`<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(renderInline(lines[i].replace(/^\d+\.\s+/, "")));
        i++;
      }
      out.push(`<ol>${items.map((item) => `<li>${item}</li>`).join("")}</ol>`);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) {
      para.push(renderInline(lines[i]));
      i++;
    }
    if (para.length > 0) {
      out.push(`<p>${para.join("<br>")}</p>`);
    }
  }

  return out.join("\n");
}
