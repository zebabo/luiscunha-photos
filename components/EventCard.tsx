import Link from "next/link";
import { formatDate } from "@/lib/format";
import { thumbUrl } from "@/lib/media";
import type { EventWithStats } from "@/lib/repo";
import type { Lang, T } from "@/lib/i18n";

export function EventCard({ e, lang, t }: { e: EventWithStats; lang: Lang; t: T }) {
  return (
    <Link href={`/eventos/${e.slug}`} className="event-card">
      <div className="cover">{e.cover_key && <img src={thumbUrl(e.cover_key)} alt={e.title} loading="lazy" />}</div>
      <div className="date">{formatDate(e.event_date, lang)}</div>
      <h3>{e.title}</h3>
      <div className="meta">
        {[e.location, t("event.photos", { n: e.photo_count })].filter(Boolean).join(" · ")}
      </div>
    </Link>
  );
}
