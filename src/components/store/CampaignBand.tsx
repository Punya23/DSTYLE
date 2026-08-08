import Image from "next/image";
import Link from "next/link";
import { Reveal } from "./Section";

interface CampaignBandProps {
  src: string;
  alt: string;
  /** CSS object-position — every source photo is a portrait studio shot. */
  focalPoint?: string;
  eyebrow: string;
  label: string;
  href: string;
}

/**
 * Full-bleed campaign photo — a deliberate break between two rails of small
 * product cards, the way a print lookbook interrupts a grid with a single
 * spread. No shell, no rounded corners, no card chrome: the point is that it
 * runs the full width and reads as one uninterrupted photograph. Rows of
 * cards alone read as an inventory list; this is what keeps the page from
 * feeling like one.
 */
export function CampaignBand({ src, alt, focalPoint, eyebrow, label, href }: CampaignBandProps) {
  return (
    <Reveal>
      <Link
        href={href}
        className="group relative block h-[62vh] min-h-[420px] w-full overflow-hidden bg-brand-ink md:h-[78vh] md:min-h-[560px]"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          className="object-cover transition-transform duration-[1400ms] ease-lux group-hover:scale-[1.04]"
          style={{ objectPosition: focalPoint ?? "center" }}
        />
        <div className="pointer-events-none absolute inset-0 media-scrim opacity-60" />

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
          <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-champagne">{eyebrow}</p>
          <div className="mt-3 flex items-center gap-3">
            <h3 className="font-display italic text-3xl text-white sm:text-4xl lg:text-5xl">{label}</h3>
            <span className="link-reveal text-[11px] font-sans tracking-luxe uppercase text-white/80 transition-colors duration-300 group-hover:text-white">
              Shop now
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
