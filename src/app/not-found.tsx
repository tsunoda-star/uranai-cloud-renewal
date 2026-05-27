import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-content flex-col items-center px-4 py-24 text-center sm:px-6">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-rose-pale"
        aria-hidden="true"
      >
        <Compass className="h-8 w-8 text-brand-teal-strong" />
      </span>
      <h1 className="mt-6 font-heading text-h1 font-bold text-primary">
        ページが見つかりません
      </h1>
      <p className="mt-3 text-body-lg text-gray-500">
        お探しのページは移動または削除された可能性があります。
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/">トップへ戻る</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/advisors">占い師を探す</Link>
        </Button>
      </div>
    </div>
  );
}
