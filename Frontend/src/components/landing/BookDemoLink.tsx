import { getCalendlyBookDemoUrl } from "@/lib/calendly";

import { MaterialIcon } from "./MaterialIcon";

type BookDemoLinkProps = {
  className: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  disabledClassName?: string;
  disabledTitle?: string;
  onClick?: () => void;
};

export function BookDemoLink({
  className,
  children = "Book Demo",
  showIcon = false,
  disabledClassName,
  disabledTitle = "Set NEXT_PUBLIC_CALENDLY_URL to enable booking",
  onClick,
}: BookDemoLinkProps) {
  const calendlyUrl = getCalendlyBookDemoUrl();

  if (!calendlyUrl) {
    return (
      <span
        className={disabledClassName ?? `${className} cursor-not-allowed opacity-60`}
        title={disabledTitle}
      >
        {showIcon ? (
          <MaterialIcon name="calendar_month" className="text-[20px] text-[#0050cb]" />
        ) : null}
        {children}
      </span>
    );
  }

  return (
    <a
      href={calendlyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={onClick}
    >
      {showIcon ? (
        <MaterialIcon name="calendar_month" className="text-[20px] text-[#0050cb]" />
      ) : null}
      {children}
    </a>
  );
}
