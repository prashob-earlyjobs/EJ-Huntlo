import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

export const MARKETING_PAGES = {
  about: {
    path: "/about",
    eyebrow: "Company",
    title: "About Huntlo.ai",
    description:
      "Huntlo.ai is an AI Recruiting OS designed for modern hiring teams, staffing firms, recruitment agencies, startups, enterprises, and Global Capability Centers (GCCs).",
    ogImage: OG_IMAGES.about,
  },
  careers: {
    path: "/careers",
    eyebrow: "Company",
    title: "Careers at Huntlo",
    description:
      "Join the team building recruiting infrastructure for the AI era — sourcing, engagement, and hiring automation.",
    ogImage: OG_IMAGES.careers,
  },
  contact: {
    path: "/contact",
    eyebrow: "Company",
    title: "Contact us",
    description:
      "Get in touch with Huntlo for sales, support, partnerships, and security inquiries. Book a demo or email our team.",
    ogImage: OG_IMAGES.platform,
  },
  faqs: {
    path: "/faqs",
    eyebrow: "Support",
    title: "Frequently Asked Questions About Huntlo AI Recruiting OS",
    description:
      "Find answers about Huntlo's AI recruiting platform, candidate sourcing, outreach automation, screening, interviews, integrations, pricing, security, and implementation.",
    ogImage: OG_IMAGES.faqs,
  },
  documentation: {
    path: "/docs",
    eyebrow: "Resources",
    title: "Documentation",
    description:
      "Product guides and reference for Huntlo sourcing, campaigns, outreach, and integrations.",
    ogImage: OG_IMAGES.documentation,
  },
  resources: {
    path: "/resources",
    eyebrow: "Resources",
    title: "Resources",
    description:
      "Guides, playbooks, and tools for AI-powered sourcing, outbound recruiting, and modern hiring teams.",
    ogImage: OG_IMAGES.resources,
  },
  solutions: {
    path: "/solutions",
    eyebrow: "Solutions",
    title: "Recruiting solutions",
    description:
      "Outbound recruiting, staffing workflows, high-volume hiring, and AI engagement for modern talent teams.",
    ogImage: OG_IMAGES.solutions,
  },
  platform: {
    path: "/platform",
    eyebrow: "Platform",
    title: "The Huntlo platform",
    description:
      "Source candidates, run multi-channel outreach, and manage hiring workflows in one AI-native recruiting OS.",
    ogImage: OG_IMAGES.platform,
  },
  pricing: {
    path: "/pricing",
    eyebrow: "Pricing",
    title: "Pricing",
    description:
      "Transparent plans for solo recruiters and growing teams — AI sourcing, outreach, and campaign automation.",
    ogImage: OG_IMAGES.pricing,
  },
  bookDemo: {
    path: "/book-a-demo",
    eyebrow: "Get started",
    title: "Book a demo",
    description:
      "See how Huntlo helps your team source candidates, automate outreach, and hire faster with AI.",
    ogImage: OG_IMAGES.bookDemo,
  },
} as const;

export type MarketingPageKey = keyof typeof MARKETING_PAGES;

export function marketingPageMetadata(key: MarketingPageKey) {
  const page = MARKETING_PAGES[key];
  return buildPageMetadata({
    title: `${page.title} | Huntlo`,
    description: page.description,
    ogImage: page.ogImage,
    path: page.path,
  });
}
