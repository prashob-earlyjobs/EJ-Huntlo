type Props = {
  provider: string;
  className?: string;
  title?: string;
};

const BRAND_IMAGES: Record<string, { src: string; alt: string }> = {
  gmail: { src: "/integrations/gmail.svg", alt: "Gmail" },
  outlook: { src: "/integrations/outlook_logo.png", alt: "Outlook" },
  zoho_mail: { src: "/integrations/zoho_mail_logo.png", alt: "Zoho Mail" },
  whatsapp: { src: "/integrations/whatsapp.svg", alt: "WhatsApp" },
  linkedin: { src: "/integrations/linkedin.svg", alt: "LinkedIn" },
  calendly: { src: "/integrations/calendly_logo.png", alt: "Calendly" },
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

function CustomMailLogo({ className }: { className?: string }) {
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
      <rect width="24" height="24" rx="5" fill="#f1f5f9" />
      <path
        fill="#475569"
        d="M7 8h10v1.5H7V8zm0 3.25h10v1.5H7v-1.5zm0 3.25h6.5v1.5H7v-1.5z"
      />
      <circle cx="17.5" cy="16.5" r="3.25" fill="#0050cb" />
      <path
        fill="#fff"
        d="M16.35 16.5h.9v1.8h1.8v.9h-1.8v1.8h-.9v-1.8h-1.8v-.9h1.8v-1.8z"
      />
    </svg>
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

  if (provider === "custom_mail") {
    return <CustomMailLogo className={className} />;
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
