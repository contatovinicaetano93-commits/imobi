import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://imobi-web-ten.vercel.app";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/simulador`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/quem-somos`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/como-funciona`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contato`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/cadastro`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/termos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
