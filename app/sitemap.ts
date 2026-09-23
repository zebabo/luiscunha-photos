import type { MetadataRoute } from "next";
import { config } from "@/lib/config";
import { listPublishedEvents } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${config.siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    ...listPublishedEvents().map((e) => ({
      url: `${config.siteUrl}/eventos/${e.slug}`,
      lastModified: e.event_date ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
