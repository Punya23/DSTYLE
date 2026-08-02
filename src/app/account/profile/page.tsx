import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/account";
import { AccountSection } from "@/components/account/AccountSection";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PasswordForm } from "@/components/account/PasswordForm";

export const metadata = { title: "Profile · Dstyle" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      emailVerified: true,
      createdAt: true,
      passwordHash: true,
    },
  });
  if (!user) redirect("/");

  return (
    <div className="space-y-12">
      <AccountSection
        title="Personal Details"
        description={`Member since ${formatDate(user.createdAt)}`}
      >
        <ProfileForm
          name={user.name ?? ""}
          phone={user.phone ?? ""}
          email={user.email ?? "—"}
          emailVerified={Boolean(user.emailVerified)}
        />
      </AccountSection>

      <AccountSection
        title="Password"
        description="Used for email-and-password sign-in."
      >
        <PasswordForm hasPassword={Boolean(user.passwordHash)} />
      </AccountSection>
    </div>
  );
}
