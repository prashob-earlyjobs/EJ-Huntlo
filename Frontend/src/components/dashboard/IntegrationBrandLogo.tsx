type Props = {
  provider: string;
  className?: string;
  title?: string;
};

const BRAND_IMAGES: Record<string, { src: string; alt: string }> = {
  gmail: { src: "/integrations/gmail.svg", alt: "Gmail" },
  whatsapp: { src: "/integrations/whatsapp.svg", alt: "WhatsApp" },
};

function BrandImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className={`dashboard-integration-brand-logo ${className ?? ""}`.trim()}
      title={alt}
    />
  );
}

function GoogleCalendarLogo({ className }: { className?: string }) {
  const shared = `dashboard-integration-brand-logo ${className ?? ""}`.trim();
  return (
    <svg
      className={shared}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <path fill="#fff" d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
      <path fill="#EA4335" d="M5 4h14v2H5V4z" />
      <path fill="#4285F4" d="M3 8h18v14H3V8z" />
      <path
        fill="#fff"
        d="M7 11h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 15h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"
      />
      <path fill="#34A853" d="M5 4h2v2H5V4zm12 0h2v2h-2V4z" />
      <path fill="#FBBC04" d="M3 8h3v2H3V8zm15 0h3v2h-3V8z" />
    </svg>
  );
}

export function IntegrationBrandLogo({ provider, className = "", title }: Props) {
  const label = title ?? provider;
  const brand = BRAND_IMAGES[provider];

  if (brand) {
    return (
      <BrandImage src={brand.src} alt={brand.alt} className={className} />
    );
  }

  if (provider === "google_calendar") {
    return <GoogleCalendarLogo className={className} />;
  }

  return (
    <span
      className={`dashboard-integration-brand-logo dashboard-integration-brand-logo--fallback ${className}`.trim()}
      aria-hidden
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}
