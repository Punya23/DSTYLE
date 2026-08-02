import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password · Dstyle",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="pt-[72px] min-h-screen bg-brand-ivory">
      <div className="mx-auto max-w-[440px] px-6 py-20">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
