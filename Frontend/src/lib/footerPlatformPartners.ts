export type FooterPlatformPartner = {
  name: string;
  href: string;
  logoSrc: string;
  /** Shown on hover (title) and for screen readers. */
  description: string;
};

/** Footer “Supported platforms” — logo asset → platform. */
export const FOOTER_PLATFORM_PARTNERS: FooterPlatformPartner[] = [
  {
    name: "ChatGPT",
    href: "https://chatgpt.com/",
    logoSrc: "/ai_platform_logo/7ud8D03WW4Xz07m1QMs2FDOfTsI.avif",
    description: "ChatGPT logo",
  },
  {
    name: "Grok",
    href: "https://grok.com/",
    logoSrc: "/ai_platform_logo/DOvioIjyXLpNCXgY4C5nNa27mZw.avif",
    description: "Grok logo",
  },
  {
    name: "Claude",
    href: "https://claude.ai/",
    logoSrc: "/ai_platform_logo/VvjO4WL1ltvgOoqHT1CkwK1ux7U.avif",
    description: "Claude logo",
  },
  {
    name: "Gemini",
    href: "https://gemini.google.com/",
    logoSrc: "/ai_platform_logo/jEoZsXXHmUeMCBMhNKQ2cCLGO5U.avif",
    description: "Gemini logo",
  },
  {
    name: "Perplexity",
    href: "https://www.perplexity.ai/",
    logoSrc: "/ai_platform_logo/tY3GhsAA7ImzHjzp9QP55Rs9Ng.avif",
    description: "Perplexity logo",
  },
  {
    name: "Bing AI",
    href: "https://www.bing.com/chat",
    logoSrc: "/ai_platform_logo/zeHXnTcYIt76cdHGqVTEKVCB5bc.avif",
    description: "Bing AI logo",
  },
];
