import Image from "next/image";

type Props = {
  className?: string;
  priority?: boolean;
};

export function LandingLogo({ className = "h-12 w-auto md:h-14", priority = false }: Props) {
  return (
    <Image
      src="/logo.png"
      alt="Huntlo"
      width={178}
      height={121}
      className={className}
      priority={priority}
    />
  );
}
