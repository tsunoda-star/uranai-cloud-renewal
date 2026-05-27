"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Link2Off,
  Code,
  Minus,
  Undo2,
  Redo2,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * RichTextEditor — Tiptap WYSIWYG（AC-C2-1〜10, component-specs/rich-text-editor.md）.
 *
 * - StarterKit（見出し/太字/斜体/取消線/リスト/引用/コードブロック/区切り線/履歴）+ Link。
 * - 出力は Tiptap doc JSON。保存時にサーバーで allow-list HTML 化（SEC-5, content-html.ts）。
 *   このコンポーネントは HTML を生成しない（JSON のみを親に渡す）。
 * - Client Component。Next App Router の hydration 整合のため immediatelyRender: false。
 * - アクセシビリティ: ツールバー各ボタンに aria-label / aria-pressed、44px タップ領域、
 *   エディタ領域 role="textbox" aria-multiline。キーボードショートカット（StarterKit 標準）。
 */

export interface RichTextEditorHandle {
  /** 現在の doc JSON を取得（フォーム送信時に hidden input へ詰める）。 */
  getJSON: () => unknown;
  /** 本文が空（テキストなし）か。 */
  isEmpty: () => boolean;
}

interface RichTextEditorProps {
  /** 初期 doc JSON（編集時）。未指定なら空ドキュメント。 */
  initialContent?: unknown;
  /** 変更時コールバック（hidden input 同期 + 文字数表示用）。 */
  onChange?: (json: unknown, plainTextLength: number) => void;
  /** エディタ領域のラベル（aria）。 */
  ariaLabel?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active ?? false}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-base border border-transparent text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40",
        active
          ? "border-brand-teal bg-brand-rose-pale text-brand-teal-strong"
          : "hover:bg-secondary"
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  // useEditorState なしでも shouldRerenderOnTransaction（既定 true）で再描画される。
  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  function toggleLink() {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const previous = (editor.getAttributes("link").href as string) ?? "";
    const url = window.prompt("リンク先 URL を入力してください（http(s):// など）", previous);
    if (url === null) return; // キャンセル
    const trimmed = url.trim();
    if (trimmed === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: trimmed })
      .run();
  }

  return (
    <div
      role="toolbar"
      aria-label="書式設定"
      className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-secondary/40 p-2"
    >
      <ToolbarButton
        label="見出し2"
        active={isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="見出し3"
        active={isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>

      <span className="mx-1 h-6 w-px bg-gray-200" aria-hidden="true" />

      <ToolbarButton
        label="太字"
        active={isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="斜体"
        active={isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="取り消し線"
        active={isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="インラインコード"
        active={isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>

      <span className="mx-1 h-6 w-px bg-gray-200" aria-hidden="true" />

      <ToolbarButton
        label="箇条書きリスト"
        active={isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="番号付きリスト"
        active={isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="引用"
        active={isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="区切り線"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>

      <span className="mx-1 h-6 w-px bg-gray-200" aria-hidden="true" />

      <ToolbarButton
        label={editor.isActive("link") ? "リンクを解除" : "リンクを挿入"}
        active={isActive("link")}
        onClick={toggleLink}
      >
        {editor.isActive("link") ? (
          <Link2Off className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Link2 className="h-5 w-5" aria-hidden="true" />
        )}
      </ToolbarButton>

      <span className="mx-1 h-6 w-px bg-gray-200" aria-hidden="true" />

      <ToolbarButton
        label="元に戻す"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="やり直す"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-5 w-5" aria-hidden="true" />
      </ToolbarButton>
    </div>
  );
}

export const RichTextEditor = React.forwardRef<
  RichTextEditorHandle,
  RichTextEditorProps
>(function RichTextEditor({ initialContent, onChange, ariaLabel }, ref) {
  const [charCount, setCharCount] = React.useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        // 出力 HTML はサーバーで再生成するため、ここでの rel/protocol は表示時の暫定。
        HTMLAttributes: { rel: "nofollow noopener noreferrer" },
        protocols: ["http", "https", "mailto"],
      }),
    ],
    content: isNonEmptyDoc(initialContent)
      ? (initialContent as object)
      : emptyDoc(),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel ?? "記事本文",
        class:
          "prose max-w-none min-h-[18rem] px-4 py-3 focus:outline-none focus-visible:outline-none",
      },
    },
    onUpdate({ editor: ed }) {
      const len = ed.getText().length;
      setCharCount(len);
      onChange?.(ed.getJSON(), len);
    },
  });

  React.useEffect(() => {
    if (editor) {
      const len = editor.getText().length;
      setCharCount(len);
      onChange?.(editor.getJSON(), len);
    }
    // 初回マウント時のみ親へ初期値を伝える。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  React.useImperativeHandle(
    ref,
    () => ({
      getJSON: () => editor?.getJSON() ?? emptyDoc(),
      isEmpty: () => (editor?.getText().trim().length ?? 0) === 0,
    }),
    [editor]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-card shadow-base">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
      <div className="flex items-center justify-end border-t border-gray-200 px-4 py-2 text-xs text-gray-400">
        <span className="tabular-nums">{charCount} 文字</span>
      </div>
    </div>
  );
});

function emptyDoc(): object {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function isNonEmptyDoc(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "doc"
  );
}
