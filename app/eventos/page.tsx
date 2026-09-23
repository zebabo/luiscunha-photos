import type { Metadata } from "next";
import { listPublishedEvents } from "@/lib/repo";
import { getT } from "@/lib/i18n-server";
import { EventCard } from "@/components/EventCard";
import { SearchBar } from "@/components/SearchBar";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.events") };
}

export default async function EventsPage() {
  const { lang, t } = await getT();
  const events = listPublishedEvents();
  return (
    <div className="container">
      <h1 className="section-title" style={{ marginTop: 48 }}>
        {t("nav.events")}
      </h1>
      <p className="section-sub">{t("home.recentHint")}</p>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
        <SearchBar t={t} />
      </div>
      <div className="event-grid">
        {events.map((e) => (
          <EventCard key={e.id} e={e} lang={lang} t={t} />
        ))}
      </div>
    </div>
  );
}
