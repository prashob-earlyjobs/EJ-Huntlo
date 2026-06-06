"use client";

export type AdminMessagingChannel = "huntlo_meta" | "gupshup";

const CHANNEL_OPTIONS: {
  id: AdminMessagingChannel;
  title: string;
  description: string;
  badge?: string;
}[] = [
  {
    id: "huntlo_meta",
    title: "Huntlo Meta account",
    description:
      "WhatsApp Cloud API using Huntlo's Meta Business credentials on the server. Users can choose Huntlo or their own Meta when connecting.",
  },
  {
    id: "gupshup",
    title: "Gupshup account",
    description:
      "Route outbound WhatsApp through Gupshup Gateway (SENDMESSAGE). Requires GUPSHUP_USERID/PASSWORD (or reply/template pairs). Register incoming + delivery-report webhook URLs in Gupshup Console.",
  },
];

type Props = {
  value: AdminMessagingChannel;
  onChange: (channel: AdminMessagingChannel) => void;
  disabled?: boolean;
  updatedAt?: string | null;
};

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminMessagingChannelSettings({
  value,
  onChange,
  disabled = false,
  updatedAt = null,
}: Props) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Huntlo messaging channel
        </legend>
        <div className="dashboard-wa-opening-templates-grid max-w-2xl">
          {CHANNEL_OPTIONS.map((option) => {
            const active = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`dashboard-wa-opening-template-card text-left${
                  active ? " dashboard-wa-opening-template-card--active" : ""
                }`}
                disabled={disabled}
                onClick={() => onChange(option.id)}
              >
                <span className="dashboard-wa-opening-template-card-head">
                  <span
                    className={`dashboard-wa-opening-template-radio${
                      active ? " dashboard-wa-opening-template-radio--active" : ""
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="dashboard-wa-opening-template-name">{option.title}</span>
                      {option.badge ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                          {option.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="dashboard-wa-opening-template-desc">{option.description}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Saved settings apply platform-wide. All WhatsApp sends, webhooks, and Integrations use the
        selected provider. Configure Gupshup credentials in Backend <code>.env</code> when using
        Gupshup.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <span className="font-medium text-slate-900">Saved selection: </span>
        {value === "huntlo_meta" ? "Huntlo Meta account" : "Gupshup account"}
        {updatedAt ? (
          <span className="mt-1 block text-xs text-slate-500">
            Last updated {formatUpdatedAt(updatedAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
