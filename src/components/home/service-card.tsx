import Link from "next/link";
import { Clock } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { METHOD_META } from "@/lib/divination";
import { formatInt, formatJpy } from "@/lib/format";
import type { ServiceCardView } from "@/lib/queries";

/**
 * ServiceCard — a bookable consultation menu.
 * Title, provider (avatar + name link -> /advisors/{slug}), category Badge,
 * method Badge, price (Outfit 700 tabular-nums + 円) and duration (分).
 * Whole card links to /services/{id}.
 */
export function ServiceCard({ service }: { service: ServiceCardView }) {
  const method = METHOD_META[service.method];
  const MethodIcon = method.icon;

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-gray-200 bg-card p-6 shadow-base transition-[transform,box-shadow] duration-200 ease-snap hover:-translate-y-1 hover:shadow-md">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="accent">{service.category.label}</Badge>
        <Badge variant="secondary" className="gap-1">
          <MethodIcon className="h-3 w-3" aria-hidden="true" />
          {method.label}
        </Badge>
      </div>

      <h3 className="mt-3 line-clamp-2 font-heading text-h4 font-semibold text-primary">
        <Link
          href={`/services/${service.id}`}
          aria-label={`鑑定メニュー「${service.title}」の詳細を見る`}
          className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
        >
          {service.title}
        </Link>
      </h3>

      <div className="mt-3 flex items-center gap-2">
        <Avatar
          name={service.advisor.displayName}
          src={service.advisor.avatarUrl}
          size="sm"
        />
        <span className="relative z-10 text-sm text-gray-500">
          <Link
            href={`/advisors/${service.advisor.slug}`}
            className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
          >
            {service.advisor.displayName}
          </Link>
        </span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-5">
        <p className="font-heading text-h3 font-bold tabular-nums text-primary">
          {formatJpy(service.priceJpy)}
          <span className="ml-0.5 text-base font-semibold text-gray-500">
            円
          </span>
        </p>
        <p className="flex items-center gap-1 text-sm text-gray-500">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span className="tabular-nums">{formatInt(service.durationMin)}</span>
          分
        </p>
      </div>
    </article>
  );
}
