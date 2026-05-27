import { describe, it, expect } from "vitest";
import {
  tiptapJsonToSafeHtml,
  tiptapJsonToPlainText,
  buildExcerpt,
  isTiptapDoc,
  type TiptapDoc,
} from "@/lib/blog/content-html";

/**
 * 単体: Tiptap JSON → 許可タグのみの安全 HTML（U-8, SEC-5 / spec §4.2）.
 *
 * allow-list 方式: <script>/onerror/javascript: は出力されえない（構造を作れない）。
 */

function doc(...content: TiptapDoc["content"] extends infer T ? T : never[]): TiptapDoc {
  return { type: "doc", content: content as TiptapDoc["content"] };
}

function paragraph(...children: unknown[]) {
  return { type: "paragraph", content: children };
}
function text(value: string, marks?: unknown[]) {
  return marks ? { type: "text", text: value, marks } : { type: "text", text: value };
}

describe("tiptapJsonToSafeHtml — allow-list (SEC-5)", () => {
  it("段落とテキストを <p> で出力", () => {
    const html = tiptapJsonToSafeHtml(doc(paragraph(text("こんにちは"))));
    expect(html).toBe("<p>こんにちは</p>");
  });

  it("許可マーク（strong/em/s/code）を保持", () => {
    const html = tiptapJsonToSafeHtml(
      doc(
        paragraph(
          text("太字", [{ type: "bold" }]),
          text("斜体", [{ type: "italic" }]),
          text("打消", [{ type: "strike" }]),
          text("コード", [{ type: "code" }])
        )
      )
    );
    expect(html).toContain("<strong>太字</strong>");
    expect(html).toContain("<em>斜体</em>");
    expect(html).toContain("<s>打消</s>");
    expect(html).toContain("<code>コード</code>");
  });

  it("見出しは H2/H3 に正規化（H1/H4+ は H2/H3 に丸める）", () => {
    const h1 = tiptapJsonToSafeHtml(
      doc({ type: "heading", attrs: { level: 1 }, content: [text("見出し1")] })
    );
    expect(h1).toBe("<h2>見出し1</h2>");
    const h5 = tiptapJsonToSafeHtml(
      doc({ type: "heading", attrs: { level: 5 }, content: [text("見出し5")] })
    );
    expect(h5).toBe("<h3>見出し5</h3>");
  });

  it("リスト（bulletList / orderedList / listItem）を出力", () => {
    const ul = tiptapJsonToSafeHtml(
      doc({
        type: "bulletList",
        content: [
          { type: "listItem", content: [paragraph(text("項目1"))] },
          { type: "listItem", content: [paragraph(text("項目2"))] },
        ],
      })
    );
    expect(ul).toBe("<ul><li><p>項目1</p></li><li><p>項目2</p></li></ul>");
  });

  it("codeBlock の中身はエスケープされる（HTML 注入されない）", () => {
    const html = tiptapJsonToSafeHtml(
      doc({ type: "codeBlock", content: [text("<script>alert(1)</script>")] })
    );
    expect(html).toBe("<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>");
  });

  it("blockquote / horizontalRule / hardBreak を出力", () => {
    expect(
      tiptapJsonToSafeHtml(doc({ type: "blockquote", content: [paragraph(text("引用"))] }))
    ).toBe("<blockquote><p>引用</p></blockquote>");
    expect(tiptapJsonToSafeHtml(doc({ type: "horizontalRule" }))).toBe("<hr />");
    expect(
      tiptapJsonToSafeHtml(doc(paragraph(text("a"), { type: "hardBreak" }, text("b"))))
    ).toBe("<p>a<br />b</p>");
  });

  // --- XSS / リンクホワイトリスト ---

  it("テキストノードに紛れ込んだ <script> はエスケープされ実行されない", () => {
    const html = tiptapJsonToSafeHtml(doc(paragraph(text("<script>alert(1)</script>"))));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("リンク href は http/https/mailto/相対/アンカーのみ許可", () => {
    const okHttps = tiptapJsonToSafeHtml(
      doc(paragraph(text("リンク", [{ type: "link", attrs: { href: "https://example.com" } }])))
    );
    expect(okHttps).toContain('<a href="https://example.com" rel="nofollow noopener noreferrer">');

    const relative = tiptapJsonToSafeHtml(
      doc(paragraph(text("内部", [{ type: "link", attrs: { href: "/advisors" } }])))
    );
    expect(relative).toContain('<a href="/advisors"');
  });

  it("javascript: / data: スキームのリンクは <a> を生成せずテキストのみ残る", () => {
    const js = tiptapJsonToSafeHtml(
      doc(paragraph(text("危険", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])))
    );
    expect(js).not.toContain("<a ");
    expect(js).toBe("<p>危険</p>");

    const data = tiptapJsonToSafeHtml(
      doc(paragraph(text("危険2", [{ type: "link", attrs: { href: "data:text/html,<script>" } }])))
    );
    expect(data).not.toContain("<a ");
    expect(data).toBe("<p>危険2</p>");
  });

  it("リンク属性値内の \" はエスケープされ属性ブレイクアウト不可", () => {
    const html = tiptapJsonToSafeHtml(
      doc(paragraph(text("x", [{ type: "link", attrs: { href: 'https://e.com/"onmouseover="x' } }])))
    );
    expect(html).toContain("&quot;");
    expect(html).not.toMatch(/href="https:\/\/e\.com\/"onmouseover/);
  });

  it("未知ノード/マークは無視され、内側テキストは失われない", () => {
    const html = tiptapJsonToSafeHtml(
      doc({ type: "customWeird", content: [paragraph(text("生き残る"))] })
    );
    expect(html).toContain("生き残る");
  });

  it("不正な入力（doc でない）は空文字を返す", () => {
    expect(tiptapJsonToSafeHtml(null)).toBe("");
    expect(tiptapJsonToSafeHtml({ type: "paragraph" })).toBe("");
    expect(tiptapJsonToSafeHtml("string")).toBe("");
  });
});

describe("isTiptapDoc", () => {
  it("doc 形のみ true", () => {
    expect(isTiptapDoc({ type: "doc", content: [] })).toBe(true);
    expect(isTiptapDoc({ type: "doc" })).toBe(true);
    expect(isTiptapDoc({ type: "para" })).toBe(false);
    expect(isTiptapDoc({ type: "doc", content: "x" })).toBe(false);
    expect(isTiptapDoc(null)).toBe(false);
  });
});

describe("tiptapJsonToPlainText / buildExcerpt", () => {
  it("プレーンテキストを抽出し空白を正規化", () => {
    const d = doc(paragraph(text("段落1")), paragraph(text("段落2")));
    expect(tiptapJsonToPlainText(d)).toBe("段落1 段落2");
  });

  it("buildExcerpt は maxLength を超えたら … を付与", () => {
    const long = "あ".repeat(200);
    const d = doc(paragraph(text(long)));
    const ex = buildExcerpt(d, 160);
    expect(ex.length).toBeLessThanOrEqual(161);
    expect(ex.endsWith("…")).toBe(true);
  });

  it("buildExcerpt は短文ならそのまま返す", () => {
    const d = doc(paragraph(text("短い抜粋")));
    expect(buildExcerpt(d, 160)).toBe("短い抜粋");
  });
});
