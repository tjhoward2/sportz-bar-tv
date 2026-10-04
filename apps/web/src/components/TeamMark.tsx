import Image from 'next/image';

/** Team logo, or a letter badge when there's no logo (athletes, TBD). */
export function TeamMark({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="size-7 object-contain"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-7 items-center justify-center rounded-full bg-surface2 text-xs font-bold text-muted"
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
