import type { Metadata } from "next";

/** Canonical origin (www) — apex huntlo.ai redirects here; OG URLs must not 307-redirect for WhatsApp. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.huntlo.ai";

/** OG images in `public/og_image/` — filenames with spaces are URL-encoded. */
export const OG_IMAGES = {
  platform: "/og_image/Platform.jpg",
  solutions: "/og_image/Solutions.jpg",
  pricing: "/og_image/Pricing.jpg",
  blog: "/og_image/Blog.jpg",
  resources: "/og_image/Resources.jpg",
  bookDemo: "/og_image/Book%20a%20Demo.jpg",
  careers: "/og_image/Careers.jpg",
  about: "/og_image/About.jpg",
  documentation: "/og_image/Documentation.jpg",
  faqs: "/og_image/FAQs.jpg",
  login: "/og_image/Login.jpg",
} as const;

/** Fallback when a page has no dedicated OG image in `public/og_image/`. */
export const DEFAULT_OG_IMAGE = OG_IMAGES.platform;

export type OgImageKey = keyof typeof OG_IMAGES;

export function absoluteUrl(path = ""): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? SITE_URL : `${SITE_URL}${normalized}`;
}

export function absoluteOgImage(ogImagePath: string): string {
  return `${SITE_URL}${ogImagePath}`;
}

type PageMetadataInput = {
  title: string;
  description: string;
  /** Defaults to `DEFAULT_OG_IMAGE` (`/og_image/Platform.jpg`). */
  ogImage?: string;
  path?: string;
};

export function buildPageMetadata({
  title,
  description,
  ogImage,
  path = "",
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const imagePath = String(ogImage || "").trim() || DEFAULT_OG_IMAGE;
  const imageUrl = absoluteOgImage(imagePath);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Huntlo",
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 626, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
