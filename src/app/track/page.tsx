import { auth } from "@/lib/auth";
import { TrackOrderForm } from "@/components/account/TrackOrderForm";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Track Your Order",
  description:
    "Follow your Dstyle order from confirmation to doorstep with your order reference and email.",
  path: "/track",
});

/** Public order tracking — works signed out, using order reference + email. */
export default async function PublicTrackPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-brand-ivory pt-[72px]">
      <div className="mx-auto max-w-[720px] px-6 py-14 lg:px-12">
        <p className="mb-2 text-[11px] font-sans tracking-luxe uppercase text-brand-gold">
          Order status
        </p>
        <h1 className="font-display italic text-4xl text-black lg:text-5xl">Track your order</h1>
        <p className="mt-2 text-[12px] font-sans text-[#888888]">
          Enter the reference from your confirmation email along with the email you ordered with.
        </p>
        <span className="mt-6 mb-10 block h-px w-16 gold-rule-solid opacity-60" />

        <TrackOrderForm defaultEmail={session?.user?.email ?? ""} />
      </div>
    </div>
  );
}
