import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/privacy"],
      disallow: ["/dashboard", "/publish", "/history", "/analytics", "/ai", "/api/"],
    },
    sitemap: "https://mocking-bird-three.vercel.app/sitemap.xml",
  };
}