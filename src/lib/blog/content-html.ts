/**
 * Tiptap (ProseMirror) JSON → サニタイズ済 HTML 変換（SEC-5, spec §4.2）.
 *
 * 方針: クライアントから受け取った HTML は **一切信頼しない**。記事本文は Tiptap の
 * 構造化 JSON (`contentJson`) として受け取り、サーバー側でノードツリーを走査して
 * **許可タグのみ**を出力する allow-list 方式で HTML 化する（contentHtml）。これにより
 * `<script>` / `onerror=` / `javascript:` など任意の注入はそもそも出力されえない。
 *
 * 許可タグ（StarterKit + Link + Table + Image の範囲に対応）:
 *   block : h2, h3, p, ul, ol, li, blockquote, pre, hr,
 *           table, tbody, tr, td, th, img
 *   inline: strong, em, s, code, a[href], br, img[src,alt]
 * これ以外のノード/マークは無視（中身のテキストは保持）。見出し level は 2/3 に正規化。
 * img の src は http(s) / 相対パスのみ許可（safeImageSrc）。
 *
 * 出力は `/blog/[slug]` の `.prose` スタイルがそのまま効く構造（globals.css 準拠）。
 */

// ---------------------------------------------------------------------------
// HTML escaping (sanitize.ts と同等。本文中のテキストノードは必ずエスケープする)
// ---------------------------------------------------------------------------

function escapeHtmlText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** URL ホワイトリスト: http(s) / mailto / 相対パスのみ。javascript:, data: 等は破棄。 */
function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const href = raw.trim();
  if (href === "") return null;
  // 相対 / アンカー は許可。
  if (href.startsWith("/") || href.startsWith("#")) return href;
  // スキーム付きは http/https/mailto のみ許可。
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(href);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme === "http" || scheme === "https" || scheme === "mailto") {
      return href;
    }
    return null; // javascript:, data:, vbscript: など
  }
  // スキームなし（example.com/...）はそのまま相対扱い。
  return href;
}

/** 画像 src ホワイトリスト: http(s) / 相対パスのみ。mailto/data/javascript: は破棄。 */
function safeImageSrc(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const src = raw.trim();
  if (src === "") return null;
  if (src.startsWith("/")) return src;
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(src);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme === "http" || scheme === "https") return src;
    return null; // data:, javascript:, mailto: 等は破棄
  }
  // スキームなし → 相対扱い
  return src;
}

function renderImage(node: PMNode): string {
  const src = safeImageSrc(node.attrs?.src);
  if (!src) return "";
  const alt = typeof node.attrs?.alt === "string" ? escapeAttr(node.attrs.alt) : "";
  return `<img src="${escapeAttr(src)}" alt="${alt}" loading="lazy" />`;
}

// ---------------------------------------------------------------------------
// ProseMirror JSON 型（最小・自前定義。@tiptap/core の型に依存しない）
// ---------------------------------------------------------------------------

interface PMMark {
  type?: string;
  attrs?: Record<string, unknown>;
}

interface PMNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: PMMark[];
  content?: PMNode[];
}

export interface TiptapDoc {
  type: "doc";
  content?: PMNode[];
}

/** 入力 JSON が最低限 Tiptap doc の形をしているか（保存前検証）。 */
export function isTiptapDoc(value: unknown): value is TiptapDoc {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown; content?: unknown };
  if (v.type !== "doc") return false;
  if (v.content !== undefined && !Array.isArray(v.content)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Inline (text + marks) → HTML
// ---------------------------------------------------------------------------

const ALLOWED_MARK_TAGS: Record<string, string> = {
  bold: "strong",
  strong: "strong",
  italic: "em",
  em: "em",
  strike: "s",
  s: "s",
  code: "code",
};

function renderTextNode(node: PMNode): string {
  const text = typeof node.text === "string" ? escapeHtmlText(node.text) : "";
  if (text === "") return "";

  const marks = Array.isArray(node.marks) ? node.marks : [];
  let openTags = "";
  let closeTags = "";

  for (const mark of marks) {
    const type = typeof mark.type === "string" ? mark.type : "";
    if (type === "link") {
      const href = safeHref(mark.attrs?.href);
      if (href) {
        // 外部リンクは安全のため rel を付与（target は本文制御に委ねず付けない）。
        openTags += `<a href="${escapeAttr(href)}" rel="nofollow noopener noreferrer">`;
        closeTags = `</a>` + closeTags;
      }
      continue;
    }
    const tag = ALLOWED_MARK_TAGS[type];
    if (tag) {
      openTags += `<${tag}>`;
      closeTags = `</${tag}>` + closeTags;
    }
  }

  return openTags + text + closeTags;
}

function renderInlineContent(nodes: PMNode[] | undefined): string {
  if (!Array.isArray(nodes)) return "";
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") {
      out += renderTextNode(node);
    } else if (node.type === "hardBreak") {
      out += "<br />";
    } else if (node.type === "image") {
      // image は extension-image の設定次第で inline / block どちらにもなり得る。
      // インライン位置で出現した場合もここで描画する。
      out += renderImage(node);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Block nodes → HTML
// ---------------------------------------------------------------------------

function renderListItems(nodes: PMNode[] | undefined): string {
  if (!Array.isArray(nodes)) return "";
  let out = "";
  for (const item of nodes) {
    if (item.type !== "listItem") continue;
    out += `<li>${renderBlockContent(item.content)}</li>`;
  }
  return out;
}

function renderTableRow(node: PMNode): string {
  const cells = (node.content ?? [])
    .filter((c) => c.type === "tableCell" || c.type === "tableHeader")
    .map((c) =>
      c.type === "tableHeader"
        ? `<th>${renderBlockContent(c.content)}</th>`
        : `<td>${renderBlockContent(c.content)}</td>`
    )
    .join("");
  if (cells === "") return "";
  return `<tr>${cells}</tr>`;
}

function renderBlockNode(node: PMNode): string {
  switch (node.type) {
    case "paragraph": {
      const inner = renderInlineContent(node.content);
      // 空段落は出力しない（余計な空 <p> を避ける）。
      return inner.trim() === "" ? "" : `<p>${inner}</p>`;
    }
    case "heading": {
      const rawLevel = Number(node.attrs?.level);
      // 記事内見出しは H2/H3 に正規化（H1 はページタイトル専用, spec / rich-text-editor.md）。
      const level = rawLevel >= 3 ? 3 : 2;
      const inner = renderInlineContent(node.content);
      return inner.trim() === "" ? "" : `<h${level}>${inner}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${renderListItems(node.content)}</ul>`;
    case "orderedList":
      return `<ol>${renderListItems(node.content)}</ol>`;
    case "blockquote":
      return `<blockquote>${renderBlockContent(node.content)}</blockquote>`;
    case "codeBlock": {
      // codeBlock の中身はテキストのみ（マーク無視・エスケープ）。
      const text = (node.content ?? [])
        .map((c) => (typeof c.text === "string" ? c.text : ""))
        .join("");
      return `<pre><code>${escapeHtmlText(text)}</code></pre>`;
    }
    case "horizontalRule":
      return `<hr />`;
    case "paragraph_empty":
      return "";
    case "image":
      // block 位置に置かれた image（extension-image の inline: false の挙動）。
      return renderImage(node);
    case "table": {
      // Tiptap の table 構造: table > tableRow > (tableCell | tableHeader) > paragraph > text
      // 不正な子はスキップしつつ <table><tbody>...</tbody></table> で囲む。
      const rows = (node.content ?? [])
        .filter((r) => r.type === "tableRow")
        .map(renderTableRow)
        .join("");
      if (rows === "") return "";
      return `<table><tbody>${rows}</tbody></table>`;
    }
    case "tableRow":
      // 通常 table 配下からしか来ないが、念のため独立して描画可能に。
      return renderTableRow(node);
    case "tableCell":
      return `<td>${renderBlockContent(node.content)}</td>`;
    case "tableHeader":
      return `<th>${renderBlockContent(node.content)}</th>`;
    default:
      // 未知ブロックは内側の block を再帰描画（テキストを失わない）。
      if (Array.isArray(node.content)) return renderBlockContent(node.content);
      return "";
  }
}

function renderBlockContent(nodes: PMNode[] | undefined): string {
  if (!Array.isArray(nodes)) return "";
  return nodes.map(renderBlockNode).join("");
}

/**
 * Tiptap doc JSON → サニタイズ済 HTML。許可タグ以外は構造ごと出力されない（SEC-5）。
 * 不正な入力（doc でない）は空文字を返す（呼び出し側で本文必須を検証する想定）。
 */
export function tiptapJsonToSafeHtml(doc: unknown): string {
  if (!isTiptapDoc(doc)) return "";
  return renderBlockContent(doc.content);
}

// ---------------------------------------------------------------------------
// Plain text 抽出（excerpt 自動生成 / 本文空判定）
// ---------------------------------------------------------------------------

function collectText(nodes: PMNode[] | undefined, acc: string[]): void {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (node.type === "text" && typeof node.text === "string") {
      acc.push(node.text);
    } else if (node.type === "hardBreak") {
      acc.push(" ");
    } else if (Array.isArray(node.content)) {
      collectText(node.content, acc);
      acc.push(" ");
    }
  }
}

/** doc から純テキストを取り出す（空白を正規化）。 */
export function tiptapJsonToPlainText(doc: unknown): string {
  if (!isTiptapDoc(doc)) return "";
  const acc: string[] = [];
  collectText(doc.content, acc);
  return acc.join("").replace(/\s+/g, " ").trim();
}

/** 抜粋の自動生成（excerpt 未入力時のフォールバック）。 */
export function buildExcerpt(doc: unknown, maxLength = 160): string {
  const text = tiptapJsonToPlainText(doc);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}
