import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.SITE_URL || "https://guanxiang-oracle.anastasial6776.chatgpt.site"; return ["/","/palm","/affinity","/insights","/membership","/privacy","/terms"].map((path) => ({ url:`${base}${path}`, lastModified:new Date(), changeFrequency:path === "/" ? "weekly" : "monthly" })); }
