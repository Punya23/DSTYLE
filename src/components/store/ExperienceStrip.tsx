import Link from "next/link";
import { Gem, CalendarDays, Globe } from "lucide-react";
import { Reveal, SectionHeading } from "./Section";
import { RevealCard } from "./RevealCard";

const SERVICES = [
  {
    icon: Gem,
    title: "Bespoke Couture",
    body: "Commission a one-of-one piece, tailored to your measurements and your story.",
    href: "/about",
  },
  {
    icon: CalendarDays,
    title: "Atelier Appointments",
    body: "Private consultations for bridal and couture — in our studio or virtually.",
    href: "/about",
  },
  {
    icon: Globe,
    title: "Worldwide Delivery",
    body: "Insured shipping across India and beyond, with complimentary domestic delivery.",
    href: "/about",
  },
];

export function ExperienceStrip() {
  return (
    <section className="section-y bg-brand-white">
      <div className="shell">
        <SectionHeading
          align="center"
          eyebrow="The Dstyle Service"
          title="Couture, cared for"
          className="mb-14 lg:mb-20"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {SERVICES.map((service, i) => {
            const Icon = service.icon;
            return (
              <Reveal key={service.title} delay={i * 0.1}>
                <RevealCard className="h-full text-center border border-brand-ivory-deep px-8 py-12 lg:py-14">
                  <div className="mx-auto mb-6 grid place-items-center h-14 w-14 rounded-full border border-brand-gold/40 text-brand-gold transition-colors duration-500 group-data-[active=true]:border-brand-champagne group-data-[active=true]:text-brand-champagne">
                    <Icon size={22} strokeWidth={1.3} />
                  </div>
                  <h3 className="font-display text-2xl text-brand-ink mb-3 transition-colors duration-500 group-data-[active=true]:text-white">
                    {service.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-brand-ink-soft max-w-[320px] mx-auto text-pretty mb-6 transition-colors duration-500 group-data-[active=true]:text-white/65">
                    {service.body}
                  </p>
                  <Link
                    href={service.href}
                    className="link-reveal text-[10px] font-sans tracking-luxe uppercase text-brand-gold transition-colors duration-500 group-data-[active=true]:text-brand-champagne"
                  >
                    Learn More
                  </Link>
                </RevealCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
