import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SavedAddress } from "@/lib/address";
import { AccountSection } from "@/components/account/AccountSection";
import { AddressBook } from "@/components/account/AddressBook";

export const metadata = { title: "Addresses · Dstyle" };

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  let addresses: SavedAddress[] = [];
  try {
    addresses = await prisma.address.findMany({
      where: { userId: session.user.id, isArchived: false },
      orderBy: [{ isDefault: "desc" }, { id: "desc" }],
      select: {
        id: true,
        name: true,
        line1: true,
        line2: true,
        city: true,
        state: true,
        pincode: true,
        phone: true,
        isDefault: true,
      },
    });
  } catch {
    addresses = [];
  }

  return (
    <AccountSection
      title="Address Book"
      description="Saved addresses appear at checkout. Your default is pre-selected."
    >
      <AddressBook addresses={addresses} />
    </AccountSection>
  );
}
