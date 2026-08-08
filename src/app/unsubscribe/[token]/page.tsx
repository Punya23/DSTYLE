import { UnsubscribeConfirm } from "@/components/store/UnsubscribeConfirm";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Unsubscribe",
  description: "Stop receiving marketing email from Dstyle.",
  path: "/unsubscribe",
  // A per-token URL has nothing to index and should never appear in a result.
  noIndex: true,
});

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-brand-ivory pt-[72px]">
      <div className="mx-auto max-w-[640px] px-6 py-20 lg:px-12 lg:py-28">
        <UnsubscribeConfirm token={token} />
      </div>
    </div>
  );
}
