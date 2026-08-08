import Link from "next/link";
import { auth } from "@/lib/auth";
import { JsonLd } from "@/components/JsonLd";
import { ContactForm } from "@/components/store/ContactForm";
import { COMPANY, formattedAddress } from "@/lib/company";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema, contactPageSchema } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "Reach the Dstyle atelier — order help, sizing advice, made-to-measure enquiries and press. We reply within one business day.",
  path: "/contact",
});

const CHANNELS = [
  {
    label: "Email",
    value: COMPANY.supportEmail,
    href: `mailto:${COMPANY.supportEmail}`,
    note: `We reply ${COMPANY.responseWindow}.`,
  },
  {
    label: "Phone",
    value: COMPANY.phoneDisplay,
    href: `tel:${COMPANY.phone}`,
    note: COMPANY.supportHours,
  },
  {
    label: "Instagram",
    value: COMPANY.instagramHandle,
    href: COMPANY.instagram,
    note: "New pieces, fittings and behind the seams.",
  },
];

export default async function ContactPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-brand-ivory pt-[72px]">
      <JsonLd
        data={[
          contactPageSchema("/contact"),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
        ]}
      />

      <div className="mx-auto max-w-[1100px] px-6 py-14 lg:px-12 lg:py-20">
        <header className="max-w-[640px]">
          <p className="eyebrow text-brand-gold">Customer care</p>
          <h1 className="display-2 mt-3 text-brand-ink">Talk to the house</h1>
          <p className="body-copy mt-4">
            Order questions, sizing you are unsure about, a piece you would like
            cut to your measurements, or press — it all reaches the same small
            team, and a person answers every one.
          </p>
          <span className="mt-8 block h-px w-16 gold-rule-solid opacity-60" />
        </header>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
          <ContactForm
            defaultName={session?.user?.name ?? ""}
            defaultEmail={session?.user?.email ?? ""}
          />

          <aside className="space-y-10">
            <div>
              <h2 className="micro-label text-brand-grey-dark">Direct</h2>
              <dl className="mt-4 space-y-6">
                {CHANNELS.map((channel) => (
                  <div key={channel.label}>
                    <dt className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold">
                      {channel.label}
                    </dt>
                    <dd className="mt-1.5">
                      <a
                        href={channel.href}
                        {...(channel.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="link-reveal font-sans text-[14px] text-brand-ink transition-colors duration-300 hover:text-brand-gold"
                      >
                        {channel.value}
                      </a>
                      <p className="mt-1 font-sans text-[12px] leading-relaxed text-brand-grey-dark">
                        {channel.note}
                      </p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h2 className="micro-label text-brand-grey-dark">The atelier</h2>
              <address className="mt-4 font-sans text-[13px] leading-[1.9] text-brand-ink-soft not-italic">
                {COMPANY.address.line1}
                <br />
                {COMPANY.address.line2}
                <br />
                {COMPANY.address.city} {COMPANY.address.postalCode}
                <br />
                {COMPANY.address.state}, {COMPANY.address.country}
              </address>
              <p className="mt-3 font-sans text-[12px] leading-relaxed text-brand-grey-dark">
                Visits are by appointment — write first and we will hold a
                fitting room for you.
              </p>
            </div>

            <div className="border-t border-brand-ink/10 pt-8">
              <h2 className="micro-label text-brand-grey-dark">Faster than writing</h2>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "Track an order", href: "/track" },
                  { label: "Start a return", href: "/account/returns" },
                  { label: "Read the FAQs", href: "/faq" },
                  { label: "Shipping & delivery", href: "/policies/shipping" },
                  { label: "Returns & refunds", href: "/policies/returns" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="link-reveal font-sans text-[13px] text-brand-ink-soft transition-colors duration-300 hover:text-brand-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <p className="font-sans text-[11px] leading-relaxed text-brand-grey-dark">
              {COMPANY.legalName} · {formattedAddress()}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
