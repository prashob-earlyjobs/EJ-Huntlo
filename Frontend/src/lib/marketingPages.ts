import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

export const MARKETING_PAGES = {
  about: {
    path: "/about",
    eyebrow: "Company",
    title: "About Huntlo — Building Agentic AI Infrastructure for the Future of Recruiting",
    description:
      "Huntlo is agentic AI recruiting infrastructure built by the EarlyJobs team — helping staffing agencies, enterprises & GCCs hire faster with autonomous AI agents.",
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
    title: "Huntlo Pricing — Agentic AI Recruiting Infrastructure Plans",
    description:
      "Transparent, performance-based pricing for agentic AI recruiting — free trial, starter plans from $99/seat/month, and enterprise options for high-volume hiring teams.",
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
  demo: {
    path: "/demo",
    eyebrow: "Product demo",
    title: "Watch the Huntlo demo",
    description:
      "See Huntlo in action — AI sourcing, multi-channel outreach, screening, and hiring workflows in one recruiting OS.",
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
