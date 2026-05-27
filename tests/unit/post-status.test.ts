import { describe, it, expect } from "vitest";
import {
  canTransition,
  isSlugLocked,
  statusForAction,
  coercePostStatus,
  POST_STATUS_LABEL,
  isApprovalRequired,
} from "@/lib/blog/post-status";

/**
 * 単体: 記事ステータス遷移バリデータ（U-3, AC-C2-5/6/7 / SEO-16）.
 */
describe("post-status canTransition", () => {
  it("DRAFT からは SCHEDULED/PUBLISHED/ARCHIVED へ遷移可", () => {
    expect(canTransition("DRAFT", "SCHEDULED")).toBe(true);
    expect(canTransition("DRAFT", "PUBLISHED")).toBe(true);
    expect(canTransition("DRAFT", "ARCHIVED")).toBe(true);
    expect(canTransition("DRAFT", "DRAFT")).toBe(true);
  });

  it("SCHEDULED からは PUBLISHED/DRAFT/ARCHIVED へ遷移可", () => {
    expect(canTransition("SCHEDULED", "PUBLISHED")).toBe(true);
    expect(canTransition("SCHEDULED", "DRAFT")).toBe(true);
    expect(canTransition("SCHEDULED", "ARCHIVED")).toBe(true);
  });

  it("PUBLISHED からは ARCHIVED のみ（DRAFT/SCHEDULED 差戻し不可: 公開済み）", () => {
    expect(canTransition("PUBLISHED", "ARCHIVED")).toBe(true);
    expect(canTransition("PUBLISHED", "PUBLISHED")).toBe(true);
    expect(canTransition("PUBLISHED", "DRAFT")).toBe(false);
    expect(canTransition("PUBLISHED", "SCHEDULED")).toBe(false);
  });

  it("ARCHIVED からは PUBLISHED/DRAFT へ（再公開・再編集）", () => {
    expect(canTransition("ARCHIVED", "PUBLISHED")).toBe(true);
    expect(canTransition("ARCHIVED", "DRAFT")).toBe(true);
    expect(canTransition("ARCHIVED", "SCHEDULED")).toBe(false);
  });
});

describe("isSlugLocked (SEO-16)", () => {
  it("PUBLISHED / ARCHIVED は slug 不変（locked）", () => {
    expect(isSlugLocked("PUBLISHED")).toBe(true);
    expect(isSlugLocked("ARCHIVED")).toBe(true);
  });
  it("DRAFT / SCHEDULED は slug 変更可（unlocked）", () => {
    expect(isSlugLocked("DRAFT")).toBe(false);
    expect(isSlugLocked("SCHEDULED")).toBe(false);
  });
});

describe("statusForAction", () => {
  it("保存アクション → 目標ステータス", () => {
    expect(statusForAction("draft")).toBe("DRAFT");
    expect(statusForAction("publish")).toBe("PUBLISHED");
    expect(statusForAction("schedule")).toBe("SCHEDULED");
    expect(statusForAction("archive")).toBe("ARCHIVED");
  });
});

describe("coercePostStatus", () => {
  it("既知ステータス文字列（大文字小文字問わず）を coerce", () => {
    expect(coercePostStatus("draft")).toBe("DRAFT");
    expect(coercePostStatus("PUBLISHED")).toBe("PUBLISHED");
    expect(coercePostStatus("Scheduled")).toBe("SCHEDULED");
  });
  it("不正値は null", () => {
    expect(coercePostStatus("xxx")).toBeNull();
    expect(coercePostStatus(123)).toBeNull();
    expect(coercePostStatus(null)).toBeNull();
    expect(coercePostStatus(undefined)).toBeNull();
  });
});

describe("POST_STATUS_LABEL", () => {
  it("全ステータスに表示ラベルがある", () => {
    expect(POST_STATUS_LABEL.DRAFT).toBe("下書き");
    expect(POST_STATUS_LABEL.SCHEDULED).toBe("予約投稿");
    expect(POST_STATUS_LABEL.PUBLISHED).toBe("公開中");
    expect(POST_STATUS_LABEL.ARCHIVED).toBe("非公開");
  });
});

describe("isApprovalRequired (AC-C3-3 / OPEN-8)", () => {
  it("BLOG_APPROVAL_REQUIRED=true でのみ ON", () => {
    const prev = process.env.BLOG_APPROVAL_REQUIRED;
    process.env.BLOG_APPROVAL_REQUIRED = "true";
    expect(isApprovalRequired()).toBe(true);
    process.env.BLOG_APPROVAL_REQUIRED = "false";
    expect(isApprovalRequired()).toBe(false);
    delete process.env.BLOG_APPROVAL_REQUIRED;
    expect(isApprovalRequired()).toBe(false);
    if (prev !== undefined) process.env.BLOG_APPROVAL_REQUIRED = prev;
  });
});
