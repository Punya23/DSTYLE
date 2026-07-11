import type { Metadata } from "next";
import { StyleQuiz } from "@/components/store/StyleQuiz";

export const metadata: Metadata = {
  title: "Find Your Dstyle",
  description:
    "A 60-second style quiz to discover the Dstyle edit made for you — bridal, festive, cocktail or pret — with picks chosen for your taste.",
};

export default function StyleQuizPage() {
  return (
    <div className="pt-[72px] min-h-screen bg-brand-ivory">
      <section className="px-6 lg:px-12 pt-14 sm:pt-20 pb-24">
        <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
          <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-4">
            The Style Quiz
          </p>
          <h1 className="font-display italic text-4xl sm:text-6xl text-brand-ink leading-[1.05] mb-5 text-balance">
            Find Your Dstyle
          </h1>
          <p className="mx-auto max-w-md text-[14px] font-sans leading-relaxed text-brand-ink-soft">
            Five quick questions. We&apos;ll read your taste and reveal the edit made
            for you — then our stylist can take it from there.
          </p>
        </div>

        <StyleQuiz />
      </section>
    </div>
  );
}
