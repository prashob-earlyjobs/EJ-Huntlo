const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type HeroPromptDimensions = {
  roles: boolean;
  skills: boolean;
  location: boolean;
  experience: boolean;
};

export type HeroPromptCheckResponse = {
  success: true;
  allPresent: boolean;
  dimensions: HeroPromptDimensions;
};

type HeroPromptCheckError = {
  success?: false;
  message?: string;
  code?: string;
};

/**
 * Ask the backend to verify a hero search prompt with Gemini.
 * Only call when the local rule-based check already passed.
 */
export async function checkHeroPromptWithBackend(
  prompt: string
): Promise<HeroPromptCheckResponse> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("Enter a search query to find candidates.");
  }

  const res = await fetch(`${apiBase()}/api/public-candidates/check-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: trimmed, feCheckPassed: true }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    code?: string;
    allPresent?: boolean;
    dimensions?: HeroPromptDimensions;
  };

  if (!res.ok || data.success === false) {
    const message =
      typeof data.message === "string" && data.message.trim()
        ? data.message
        : "Could not verify your search prompt.";
    const err = new Error(message);
    (err as Error & { code?: string }).code = data.code;
    throw err;
  }

  return data as HeroPromptCheckResponse;
}
