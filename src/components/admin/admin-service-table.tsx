import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { METHOD_META } from "@/lib/divination";
import { formatJpy } from "@/lib/format";
import type { AdminServiceView } from "@/lib/queries";

/**
 * 運営: サービス一覧（閲覧専用, 全件）.
 * 公開/非公開状態を一覧表示する。サービスの編集は占い師（所有者）/ADMIN が
 * /advisor/services で行う（本テーブルは監査ビュー）。
 */
export function AdminServiceTable({
  services,
}: {
  services: AdminServiceView[];
}) {
  if (services.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-card p-8 text-center text-sm text-gray-500">
        サービスはまだ登録されていません。
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-card shadow-base">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th scope="col" className="px-4 py-3 font-medium">サービス名</th>
              <th scope="col" className="px-4 py-3 font-medium">占い師</th>
              <th scope="col" className="px-4 py-3 font-medium">カテゴリ</th>
              <th scope="col" className="px-4 py-3 font-medium">形式</th>
              <th scope="col" className="px-4 py-3 font-medium">価格</th>
              <th scope="col" className="px-4 py-3 font-medium">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-primary">{s.title}</td>
                <td className="px-4 py-3 text-gray-500">
                  <Link
                    href={`/advisors/${s.advisor.slug}`}
                    target="_blank"
                    className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
                  >
                    {s.advisor.displayName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{s.category.label}</td>
                <td className="px-4 py-3 text-gray-500">
                  {METHOD_META[s.method].label}
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-500">
                  {formatJpy(s.priceJpy)} 円
                </td>
                <td className="px-4 py-3">
                  <Badge variant={s.isPublished ? "success" : "secondary"}>
                    {s.isPublished ? "公開中" : "非公開"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
