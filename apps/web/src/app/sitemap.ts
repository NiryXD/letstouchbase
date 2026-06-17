import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = "https://letstouchbase.pages.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  // /reference is deliberately absent: token-gated pages have no business
  // being indexed
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/privacy/`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/terms/`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/support/`, changeFrequency: "monthly", priority: 0.3 }, // [Opus 4.8]
  ];
}
