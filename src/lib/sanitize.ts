/**
 * Server-side sanitization for user-supplied free text (spec §12 privacy / SEC-5).
 *
 * The consultation `summary` is 要配慮個人情報 stored as plain text and later
 * shown to the requester / 宛先占い師 / ADMIN only. It is NEVER rendered as HTML,
 * so the goal here is to neutralize control characters and HTML-significant
 * characters before persistence (defense in depth) and to bound the length —
 * not to allow any markup. We therefore strip/escape rather than allow-list.
 */

/** Remove ASCII control chars (except tab/newline); normalize CR/LF to "\n". */
function stripControlChars(input: string): string {
  const normalized = input.replace(/\r\n?/g, "\n");
  let out = "";
  for (const ch of normalized) {
    const code = ch.codePointAt(0) ?? 0;
    // Keep tab (9) and newline (10). Drop other C0 controls and DEL (127).
    const isControl =
      code <= 8 ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127;
    if (!isControl) out += ch;
  }
  return out;
}

/** Escape the 5 HTML-significant characters so stored text is inert if ever embedded. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize a free-text field for storage:
 * 1. strip control characters,
 * 2. trim surrounding whitespace,
 * 3. hard-cap to `maxLength` on the raw (pre-escape) text so the cap is
 *    predictable for users,
 * 4. collapse runs of 3+ blank lines,
 * 5. escape HTML-significant characters.
 */
export function sanitizeText(input: string, maxLength = 2000): string {
  const stripped = stripControlChars(input).trim();
  const capped = stripped.slice(0, maxLength);
  const collapsed = capped.replace(/\n{3,}/g, "\n\n");
  return escapeHtml(collapsed);
}
