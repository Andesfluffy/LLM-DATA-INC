import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/settings/datasources`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/saved`, changeFrequency: "monthly", priority: 0.5 },
  ];
}

