import { authHeaders } from "@/lib/auth";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export async function sendOutreachTestEmail(
  token: string,
  payload: { to: string; subject: string; body: string }
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${apiBase()}/api/outreach/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to send test email"
    );
  }
  return { success: true, message: data.message };
}
