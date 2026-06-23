import {
  aiPlatformAskLabel,
  buildAiPlatformAskUrl,
  type AiPlatformId,
} from "@/lib/aiPlatformAskUrls";

export type FooterPlatformPartner = {
  name: string;
  platformId: AiPlatformId;
  href: string;
  logoSrc: string;
  /** Shown on hover (title) and for screen readers. */
  description: string;
};

/** Footer AI platforms — each opens a pre-filled prompt about Huntlo on that assistant. */
export const FOOTER_PLATFORM_PARTNERS: FooterPlatformPartner[] = [
  {
    name: "ChatGPT",
    platformId: "chatgpt",
    href: buildAiPlatformAskUrl("chatgpt"),
    logoSrc: "/ai_platform_logo/7ud8D03WW4Xz07m1QMs2FDOfTsI.avif",
    description: aiPlatformAskLabel("ChatGPT"),
  },
  {
    name: "Grok",
    platformId: "grok",
    href: buildAiPlatformAskUrl("grok"),
    logoSrc: "/ai_platform_logo/DOvioIjyXLpNCXgY4C5nNa27mZw.avif",
    description: aiPlatformAskLabel("Grok"),
  },
  {
    name: "Claude",
    platformId: "claude",
    href: buildAiPlatformAskUrl("claude"),
    logoSrc: "/ai_platform_logo/VvjO4WL1ltvgOoqHT1CkwK1ux7U.avif",
    description: aiPlatformAskLabel("Claude"),
  },
  {
    name: "Gemini",
    platformId: "gemini",
    href: buildAiPlatformAskUrl("gemini"),
    logoSrc: "/ai_platform_logo/jEoZsXXHmUeMCBMhNKQ2cCLGO5U.avif",
    description: aiPlatformAskLabel("Gemini"),
  },
  {
    name: "Perplexity",
    platformId: "perplexity",
    href: buildAiPlatformAskUrl("perplexity"),
    logoSrc: "/ai_platform_logo/tY3GhsAA7ImzHjzp9QP55Rs9Ng.avif",
    description: aiPlatformAskLabel("Perplexity"),
  },
  {
    name: "Bing AI",
    platformId: "bing",
    href: buildAiPlatformAskUrl("bing"),
    logoSrc: "/ai_platform_logo/zeHXnTcYIt76cdHGqVTEKVCB5bc.avif",
    description: aiPlatformAskLabel("Copilot"),
  },
];
