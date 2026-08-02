import { getStoreConfig } from "@/lib/settings";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getStoreConfig();

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-1">Store</p>
        <h1 className="font-display italic text-3xl lg:text-4xl text-brand-ink">
          Tax &amp; Shipping
        </h1>
        <p className="text-[11px] font-sans text-[#888888] mt-1">
          Applies to every new quote. Past orders keep the figures they were placed with.
        </p>
      </div>

      <StoreSettingsForm initial={settings} />
    </div>
  );
}
