import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ sessionId: string }>;
};

/** Legacy URL → canonical session results route. */
export default async function LegacySessionResultsRedirect({ params }: Props) {
  const { sessionId } = await params;
  const sid = String(sessionId || "").trim();
  if (!sid) {
    redirect("/dashboard/sessions");
  }
  redirect(`/dashboard/sessions/${encodeURIComponent(sid)}`);
}
