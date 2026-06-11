import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type LandingBreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function LandingBreadcrumb({ items, className = "" }: LandingBreadcrumbProps) {
  return (
    <nav
      className={`text-sm text-[#434654] ${className}`.trim()}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 ? <span className="mx-2 text-[#c3c6d6]">/</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-[#0050cb]">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#141b2b]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
