import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import type { User } from "@prisma/client";
import { testDb, snapshot, BASELINE } from "./db-helper";

/**
 * I-4/I-5 結合: 予約フロー（createBookingRequest → 占い師通知 → respondToRequest
 * 状態遷移 → requester 通知）と RBAC/所有権/不正遷移の否定系（AC-B7, SEC-2/3, REL-2）.
 *
 * Server Action は next ランタイム依存（getCurrentUser/redirect/revalidatePath）のため、
 * それらをモックして純粋なドメイン+DB ロジックを実 DB に対して検証する。
 * 各テストで作成した行は afterEach で削除し baseline を維持する（leftover 0）。
 */

// --- next ランタイム依存のモック ---

// 現在ユーザーを差し替えるための可変ホルダ。
let currentUser: User | null = null;

vi.mock("@/lib/auth", () => ({
  getCurrentUser: async () => currentUser,
}));

// redirect は本物同様「投げる」ことで後続を中断する（sentinel で捕捉）。
class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

// モック設定後に対象アクションを動的 import（モックが効いた状態でロード）。
const { createBookingRequest } = await import("@/lib/actions/booking");
const { respondToRequest, cancelMyRequest } = await import("@/lib/actions/consultation");

// --- フィクスチャ ---
let requester: User; // GENERAL
let advisorUser: User; // FORTUNE_TELLER（対象占い師の所有者）
let otherAdvisorUser: User; // 別の占い師（所有権否定系）
let advisorProfileId: string;
let advisorSlug: string;
let advisorMethod: string; // 対象占い師が対応する method
const createdRequestIds: string[] = [];

beforeAll(async () => {
  requester = await testDb.user.findFirstOrThrow({ where: { role: "GENERAL" } });

  const advisor = await testDb.fortuneTellerProfile.findFirstOrThrow({
    where: { isPublished: true, methods: { some: {} } },
    select: {
      id: true,
      slug: true,
      userId: true,
      methods: { select: { method: true } },
    },
  });
  advisorProfileId = advisor.id;
  advisorSlug = advisor.slug;
  advisorMethod = advisor.methods[0].method;
  advisorUser = await testDb.user.findUniqueOrThrow({ where: { id: advisor.userId } });

  const other = await testDb.fortuneTellerProfile.findFirstOrThrow({
    where: { isPublished: true, id: { not: advisorProfileId } },
    select: { userId: true },
  });
  otherAdvisorUser = await testDb.user.findUniqueOrThrow({ where: { id: other.userId } });
});

afterEach(async () => {
  // このテストで作った request（+ cascade で slot/notification）を削除。
  if (createdRequestIds.length > 0) {
    // 関連 PreferredSlot / Notification を明示削除（FK cascade に依存しない安全側）。
    await testDb.consultationPreferredSlot.deleteMany({
      where: { requestId: { in: createdRequestIds } },
    });
    await testDb.consultationRequest.deleteMany({
      where: { id: { in: createdRequestIds } },
    });
    createdRequestIds.length = 0;
  }
  // テスト中に作られた通知を一掃（baseline notifications=0）。
  await testDb.notification.deleteMany({
    where: {
      userId: {
        in: [requester.id, advisorUser.id, otherAdvisorUser.id],
      },
    },
  });
  currentUser = null;
});

afterAll(async () => {
  const snap = await snapshot();
  // baseline 維持の最終アサーション（leftover 0）。
  expect(snap.requests).toBe(BASELINE.requests);
  expect(snap.notifications).toBe(BASELINE.notifications);
  expect(snap.preferredSlots).toBe(0);
  expect(snap.posts).toBe(BASELINE.posts);
  expect(snap.advisors).toBe(BASELINE.advisors);
  expect(snap.services).toBe(BASELINE.services);
});

/** 予約フォーム FormData を組み立てる。 */
function bookingFormData(opts: {
  advisorSlug?: string;
  method?: string;
  summary?: string;
  slots?: string[];
  serviceId?: string;
}): FormData {
  const fd = new FormData();
  fd.set("advisorSlug", opts.advisorSlug ?? advisorSlug);
  fd.set("method", opts.method ?? advisorMethod);
  fd.set(
    "summary",
    opts.summary ?? "最近の運勢について相談したいです。よろしくお願いします。"
  );
  const future = new Date(Date.now() + 7 * 86_400_000);
  const slots = opts.slots ?? [toLocalInput(future)];
  slots.forEach((s, i) => fd.set(`slot${i}`, s));
  if (opts.serviceId) fd.set("serviceId", opts.serviceId);
  return fd;
}

/** Date → "YYYY-MM-DDTHH:mm"（datetime-local）。 */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

async function trackLatestRequest(): Promise<void> {
  const latest = await testDb.consultationRequest.findFirst({
    where: { requesterId: requester.id, advisorId: advisorProfileId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (latest) createdRequestIds.push(latest.id);
}

describe("createBookingRequest (AC-B7-1/2, REL-2)", () => {
  it("認証なしはエラー（多層防御 SEC-2）", async () => {
    currentUser = null;
    const res = await createBookingRequest({ ok: false }, bookingFormData({}));
    expect(res.ok).toBe(false);
    expect(res.error).toContain("ログイン");
  });

  it("正常系: PENDING リクエスト + 希望日時 + 占い師宛通知を 1 トランザクションで作成し redirect", async () => {
    currentUser = requester;
    let redirected = "";
    try {
      await createBookingRequest({ ok: false }, bookingFormData({}));
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("NEXT_REDIRECT")) {
        redirected = e.message;
      } else {
        throw e;
      }
    }
    expect(redirected).toContain("/mypage?booked=1");

    await trackLatestRequest();
    const created = await testDb.consultationRequest.findFirst({
      where: { requesterId: requester.id, advisorId: advisorProfileId },
      orderBy: { createdAt: "desc" },
      include: { preferredSlots: true },
    });
    expect(created).not.toBeNull();
    expect(created!.status).toBe("PENDING");
    expect(created!.preferredSlots.length).toBe(1);

    // 占い師宛の通知が作られている（AC-B7-6）。要配慮情報（summary）は本文に含まない（§12）。
    const notif = await testDb.notification.findFirst({
      where: { userId: advisorUser.id, type: "CONSULTATION_STATUS" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif!.body).not.toContain(created!.summary);
  });

  it("対象占い師が非提供の相談形式は拒否（client 値を信頼しない）", async () => {
    currentUser = requester;
    // 占い師が対応しない method を探す。
    const allMethods = ["PHONE", "CHAT", "EMAIL", "ZOOM", "IN_PERSON"];
    const profile = await testDb.fortuneTellerProfile.findUniqueOrThrow({
      where: { id: advisorProfileId },
      select: { methods: { select: { method: true } } },
    });
    const supported = new Set(profile.methods.map((m) => m.method));
    const unsupported = allMethods.find((m) => !supported.has(m as never));
    if (!unsupported) {
      // 全形式対応の占い師の場合はこの否定系を skip 同等に。
      expect(true).toBe(true);
      return;
    }
    const res = await createBookingRequest(
      { ok: false },
      bookingFormData({ method: unsupported })
    );
    expect(res.ok).toBe(false);
    expect(res.fieldErrors?.method).toBeTruthy();
  });

  it("存在しない占い師 slug は拒否", async () => {
    currentUser = requester;
    const res = await createBookingRequest(
      { ok: false },
      bookingFormData({ advisorSlug: "no-such-advisor-zzz" })
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("見つかりませんでした");
  });

  it("過去日時の希望スロットは拒否（未来のみ）", async () => {
    currentUser = requester;
    const past = toLocalInput(new Date(Date.now() - 86_400_000));
    const res = await createBookingRequest({ ok: false }, bookingFormData({ slots: [past] }));
    expect(res.ok).toBe(false);
    expect(res.fieldErrors?.slots).toBeTruthy();
  });

  it("概要が短すぎる（< 10 文字）は拒否", async () => {
    currentUser = requester;
    const res = await createBookingRequest({ ok: false }, bookingFormData({ summary: "短い" }));
    expect(res.ok).toBe(false);
    expect(res.fieldErrors?.summary).toBeTruthy();
  });
});

describe("respondToRequest (AC-B7-3/4/5, SEC-3, §5.1)", () => {
  /** PENDING リクエストを 1 件作成（track 済）。 */
  async function createPending(): Promise<string> {
    const future = new Date(Date.now() + 5 * 86_400_000);
    const req = await testDb.consultationRequest.create({
      data: {
        requesterId: requester.id,
        advisorId: advisorProfileId,
        method: advisorMethod as never,
        summary: "結合テスト用の相談概要です。よろしくお願いします。",
        status: "PENDING",
        preferredSlots: { create: [{ slot: future, sortOrder: 0 }] },
      },
      select: { id: true },
    });
    createdRequestIds.push(req.id);
    return req.id;
  }

  it("占い師（宛先本人）が accept → ACCEPTED + requester 宛通知", async () => {
    const id = await createPending();
    currentUser = advisorUser;
    const res = await respondToRequest({ requestId: id, action: "accept" });
    expect(res.ok).toBe(true);

    const after = await testDb.consultationRequest.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("ACCEPTED");
    expect(after.respondedAt).not.toBeNull();

    const notif = await testDb.notification.findFirst({
      where: { userId: requester.id, type: "CONSULTATION_STATUS" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif!.title).toContain("承認");
  });

  it("reschedule は proposedSlot(未来) + responseMessage 必須、満たせば RESCHEDULED", async () => {
    const id = await createPending();
    currentUser = advisorUser;
    // メッセージ無し → invalid_input。
    const bad = await respondToRequest({
      requestId: id,
      action: "reschedule",
      proposedSlot: toLocalInput(new Date(Date.now() + 3 * 86_400_000)),
    });
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe("invalid_input");

    // 正常: proposedSlot + message。
    const ok = await respondToRequest({
      requestId: id,
      action: "reschedule",
      proposedSlot: toLocalInput(new Date(Date.now() + 3 * 86_400_000)),
      responseMessage: "別日程はいかがでしょうか。",
    });
    expect(ok.ok).toBe(true);
    const after = await testDb.consultationRequest.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("RESCHEDULED");
    expect(after.proposedSlot).not.toBeNull();
  });

  it("所有権否定: 別の占い師は forbidden（自分宛でない, SEC-3）", async () => {
    const id = await createPending();
    currentUser = otherAdvisorUser;
    const res = await respondToRequest({ requestId: id, action: "accept" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("forbidden");
    // 状態は PENDING のまま（副作用なし）。
    const after = await testDb.consultationRequest.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("PENDING");
  });

  it("RBAC 否定: GENERAL ユーザーは not_advisor", async () => {
    const id = await createPending();
    currentUser = requester; // GENERAL
    const res = await respondToRequest({ requestId: id, action: "accept" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("not_advisor");
  });

  it("不正遷移否定: ACCEPTED 済みに再 accept は invalid_transition", async () => {
    const id = await createPending();
    currentUser = advisorUser;
    await respondToRequest({ requestId: id, action: "accept" });
    const again = await respondToRequest({ requestId: id, action: "accept" });
    expect(again.ok).toBe(false);
    expect(again.error).toBe("invalid_transition");
  });

  it("存在しない request は not_found", async () => {
    currentUser = advisorUser;
    const res = await respondToRequest({ requestId: "no-such-id", action: "accept" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("not_found");
  });
});

describe("cancelMyRequest (AC-B8, SEC-3)", () => {
  async function createPending(): Promise<string> {
    const future = new Date(Date.now() + 5 * 86_400_000);
    const req = await testDb.consultationRequest.create({
      data: {
        requesterId: requester.id,
        advisorId: advisorProfileId,
        method: advisorMethod as never,
        summary: "取消テスト用の相談概要です。よろしくお願いします。",
        status: "PENDING",
        preferredSlots: { create: [{ slot: future, sortOrder: 0 }] },
      },
      select: { id: true },
    });
    createdRequestIds.push(req.id);
    return req.id;
  }

  it("所有者は PENDING を CANCELLED に取消でき、占い師へ通知", async () => {
    const id = await createPending();
    currentUser = requester;
    const res = await cancelMyRequest(id);
    expect(res.ok).toBe(true);
    const after = await testDb.consultationRequest.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("CANCELLED");
    const notif = await testDb.notification.findFirst({
      where: { userId: advisorUser.id },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
  });

  it("非所有者の取消は forbidden（SEC-3）", async () => {
    const id = await createPending();
    currentUser = otherAdvisorUser; // 別人
    const res = await cancelMyRequest(id);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("forbidden");
    const after = await testDb.consultationRequest.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("PENDING");
  });

  it("認証なしは unauthenticated", async () => {
    currentUser = null;
    const res = await cancelMyRequest("any");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("unauthenticated");
  });
});
