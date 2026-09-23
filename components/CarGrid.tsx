"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "./I18nProvider";
import { thumbUrl } from "@/lib/media";

export type GridCar = { id: number; number: string; driver: string; team: string; photoCount: number; coverKey: string | null };

export function CarGrid({ cars, baseHref }: { cars: GridCar[]; baseHref: string }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^#/, "");
    if (!s) return cars;
    return cars.filter(
      (c) => c.number.toLowerCase() === s || c.driver.toLowerCase().includes(s) || c.team.toLowerCase().includes(s),
    );
  }, [cars, q]);

  return (
    <>
      {cars.length > 8 && (
        <input
          className="filter-input"
          style={{ marginBottom: 16 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("event.filterCars")}
          aria-label={t("event.filterCars")}
        />
      )}
      <div className="car-grid">
        {shown.map((c) => (
          <Link key={c.id} href={`${baseHref}/carro/${encodeURIComponent(c.number)}`} className="car-card">
            <div className="img">{c.coverKey && <img src={thumbUrl(c.coverKey)} alt="" loading="lazy" />}</div>
            <span className="num">{c.number}</span>
            <div className="info">
              <div className="driver">{c.driver || `#${c.number}`}</div>
              {c.team && <div className="team">{c.team}</div>}
              <div className="count">{t("event.photos", { n: c.photoCount })}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
