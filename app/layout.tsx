import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import GlobalInkTrail from "./GlobalInkTrail";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "观象｜观象见心，知势而行";
  const description = "以六爻为镜，照见问题的结构。不替你决定，只帮你看清下一步。";

  return {
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, type: "website", images: [{ url: `${origin}/og-v2.png`, width: 1200, height: 630, alt: "观象，观象见心，知势而行" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og-v2.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><GlobalInkTrail />{children}</body></html>;
}
