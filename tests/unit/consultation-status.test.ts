import { describe, it, expect } from "vitest";
import type { ConsultationStatus } from "@prisma/client";
import {
  resolveAdvisorTransition,
  CONSULTATION_STATUS_META,
  type AdvisorResponseAction,
} from "@/lib/consultation-status";

/**
 * 単体: 予約状態遷移バリデータ（U-2, AC-B7-3/4/5 / spec §5.1）.
 * 占い師応答（accept/reschedule/decline）の許可/不正遷移。
 */
describe("resolveAdvisorTransition", () => {
  it("PENDING → accept/reschedule/decline は許可", () => {
    expect(resolveAdvisorTransition("PENDING", "accept")).toBe("ACCEPTED");
    expect(resolveAdvisorTransition("PENDING", "reschedule")).toBe("RESCHEDULED");
    expect(resolveAdvisorTransition("PENDING", "decline")).toBe("DECLINED");
  });

  it("RESCHEDULED → accept/decline は許可（reschedule の再提案はここでは不可）", () => {
    expect(resolveAdvisorTransition("RESCHEDULED", "accept")).toBe("ACCEPTED");
    expect(resolveAdvisorTransition("RESCHEDULED", "decline")).toBe("DECLINED");
    // reschedule → RESCHEDULED は ALLOWED_FROM[RESCHEDULED] に含まれないため null。
    expect(resolveAdvisorTransition("RESCHEDULED", "reschedule")).toBeNull();
  });

  it("終端状態（ACCEPTED/DECLINED/CANCELLED）からはすべて null（占い師応答不可）", () => {
    const terminals: ConsultationStatus[] = ["ACCEPTED", "DECLINED", "CANCELLED"];
    const actions: AdvisorResponseAction[] = ["accept", "reschedule", "decline"];
    for (const from of terminals) {
      for (const action of actions) {
        expect(resolveAdvisorTransition(from, action)).toBeNull();
      }
    }
  });
});

describe("CONSULTATION_STATUS_META", () => {
  it("全ステータスにラベル + variant がある（色のみに依存しない A11Y）", () => {
    const statuses: ConsultationStatus[] = [
      "PENDING",
      "ACCEPTED",
      "RESCHEDULED",
      "DECLINED",
      "CANCELLED",
    ];
    for (const s of statuses) {
      expect(CONSULTATION_STATUS_META[s]).toBeDefined();
      expect(CONSULTATION_STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(CONSULTATION_STATUS_META[s].variant.length).toBeGreaterThan(0);
    }
  });

  it("PENDING=受付中 / ACCEPTED=承認済み のラベルが期待通り", () => {
    expect(CONSULTATION_STATUS_META.PENDING.label).toBe("受付中");
    expect(CONSULTATION_STATUS_META.ACCEPTED.label).toBe("承認済み");
  });
});
