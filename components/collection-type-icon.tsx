import {
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  FolderKanban,
  GraduationCap,
  HeartPulse,
  Image,
  Landmark,
  LayoutGrid,
  Plane,
  ShoppingBag,
  UserRound,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  general: LayoutGrid,
  work: BriefcaseBusiness,
  personal: UserRound,
  finance: Landmark,
  projects: FolderKanban,
  bookmarks: Bookmark,
  reading: BookOpen,
  media: Image,
  travel: Plane,
  learning: GraduationCap,
  health: HeartPulse,
  shopping: ShoppingBag,
};

export function CollectionTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = icons[type] ?? CalendarDays;
  return <Icon className={className} />;
}
