import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Hand,
  Columns3,
  Compass,
  Hash,
  Eye,
  Home,
  User,
  Star,
  Moon,
  Scroll,
  BookOpen,
  PenLine,
  Orbit,
  MoreHorizontal,
  Phone,
  MessageCircle,
  Mail,
  Video,
  Users,
} from "lucide-react";
import type { ConsultationMethod } from "@prisma/client";

/**
 * Maps the seed/DB `iconKey` string (DivinationCategory.iconKey) to a concrete
 * lucide-react icon component. Unknown keys fall back to Sparkles so the UI never
 * renders an empty slot.
 */
const ICON_BY_KEY: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  hand: Hand,
  columns: Columns3,
  compass: Compass,
  hash: Hash,
  eye: Eye,
  home: Home,
  user: User,
  star: Star,
  moon: Moon,
  scroll: Scroll,
  book: BookOpen,
  pen: PenLine,
  orbit: Orbit,
  "more-horizontal": MoreHorizontal,
};

export function categoryIcon(iconKey: string | null | undefined): LucideIcon {
  if (!iconKey) return Sparkles;
  return ICON_BY_KEY[iconKey] ?? Sparkles;
}

/** Consultation method -> Japanese label + lucide icon (icon + text per A11Y-10). */
export const METHOD_META: Record<
  ConsultationMethod,
  { label: string; icon: LucideIcon }
> = {
  PHONE: { label: "電話", icon: Phone },
  CHAT: { label: "チャット", icon: MessageCircle },
  EMAIL: { label: "メール", icon: Mail },
  ZOOM: { label: "Zoom", icon: Video },
  IN_PERSON: { label: "対面", icon: Users },
};
