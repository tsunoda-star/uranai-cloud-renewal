import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FadeIn } from "./fade-in";

/**
 * Reusable section heading: eyebrow + title + optional description, with an
 * optional right-aligned "view all" link. `headingId` wires aria-labelledby.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  headingId,
  moreHref,
  moreLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  headingId: string;
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <FadeIn variant="scroll">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-content">
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal-strong">
              {eyebrow}
            </p>
          )}
          <h2
            id={headingId}
            className="mt-1 text-balance font-heading text-h1 font-bold text-primary"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-balance text-body-lg text-gray-500">
              {description}
            </p>
          )}
        </div>
        {moreHref && moreLabel && (
          <Link
            href={moreHref}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start text-sm font-semibold text-brand-teal-strong underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base sm:self-auto"
          >
            {moreLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </FadeIn>
  );
}
