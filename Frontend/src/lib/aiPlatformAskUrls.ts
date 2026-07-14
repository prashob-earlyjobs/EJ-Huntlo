import { SITE_URL } from "@/lib/siteMetadata";

/** Pre-filled question shown when users click a footer AI platform icon. */
export const HUNTLO_AI_ASK_PROMPT = `What is Huntlo (${SITE_URL})? Summarize how Huntlo helps recruiting teams with AI sourcing, multi-channel outreach, screening, and hiring automation.`;

export type AiPlatformId = "chatgpt" | "grok" | "claude" | "gemini" | "perplexity" | "bing";

/** Deep-link into each AI assistant with a Huntlo-focused prompt (GEO / AI discoverability). */
export function buildAiPlatformAskUrl(
  platform: AiPlatformId,
  prompt: string = HUNTLO_AI_ASK_PROMPT
): string {
  const encoded = encodeURIComponent(prompt);

  switch (platform) {
    case "chatgpt":
      return `https://chatgpt.com/?q=${encoded}`;
    case "perplexity":
      return `https://www.perplexity.ai/search?q=${encoded}`;
    case "claude":
      return `https://claude.ai/new?q=${encoded}`;
    case "gemini":
      return `https://gemini.google.com/app?prompt=${encoded}`;
    case "grok":
      return `https://grok.com/?q=${encoded}`;
    case "bing":
      return `https://copilot.microsoft.com/?q=${encoded}`;
  }
}

export function aiPlatformAskLabel(platformName: string): string {
  return `Ask ${platformName} about Huntlo`;
}
