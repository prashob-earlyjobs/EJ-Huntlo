import Image from "next/image";

type Props = {
  className?: string;
  priority?: boolean;
};

export function LandingLogo({ className = "h-12 w-auto md:h-14", priority = false }: Props) {
  return (
    <Image
      src="/huntlologo.png"
      alt="Huntlo"
      width={340}
      height={97}
      className={className}
      priority={priority}
    />
  );
}
