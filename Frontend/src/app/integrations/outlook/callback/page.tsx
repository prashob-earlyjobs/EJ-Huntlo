import { Suspense } from "react";

import { OutlookOAuthCallbackClient } from "./OutlookOAuthCallbackClient";

function OutlookCallbackFallback() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="dashboard-reveal-spinner mx-auto mb-4 block h-8 w-8" aria-hidden />
        <h1 className="text-lg font-semibold text-slate-900">Outlook</h1>
        <p className="mt-2 text-sm text-slate-600">Completing Outlook connection…</p>
      </div>
    </main>
  );
}

export default function OutlookOAuthCallbackPage() {
  return (
    <Suspense fallback={<OutlookCallbackFallback />}>
      <OutlookOAuthCallbackClient />
    </Suspense>
  );
}
