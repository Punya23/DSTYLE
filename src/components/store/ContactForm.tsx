"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CONTACT_TOPICS,
  contactSchema,
  type ContactInput,
} from "@/lib/account-schemas";

interface ContactFormProps {
  defaultName?: string;
  defaultEmail?: string;
}

export function ContactForm({ defaultName = "", defaultEmail = "" }: ContactFormProps) {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      phone: "",
      topic: CONTACT_TOPICS[0],
      orderRef: "",
      message: "",
      company: "",
    },
  });

  // `useWatch` rather than `watch()` — the latter returns a fresh function on
  // every render, which the React Compiler cannot memoize past.
  const message = useWatch({ control, name: "message" });
  const messageLength = message?.length ?? 0;

  async function onSubmit(values: ContactInput) {
    setFormError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(json.error ?? "Could not send that message. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setFormError("Network problem — check your connection and try again.");
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className="border border-brand-gold/30 bg-brand-gold/[0.05] px-6 py-10 text-center sm:px-10"
      >
        <p className="eyebrow text-brand-gold">Message received</p>
        <h2 className="display-3 mt-3 text-brand-ink">Thank you.</h2>
        <p className="body-copy mx-auto mt-3 max-w-[42ch]">
          A confirmation is on its way to your inbox, and someone from the house
          will reply shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 border border-brand-line bg-brand-paper p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="contact-name"
          label="Your name"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          id="contact-email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="contact-phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <Input
          id="contact-order"
          label="Order reference (optional)"
          placeholder="#4F2A9C10"
          error={errors.orderRef?.message}
          {...register("orderRef")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="contact-topic"
          className="text-[10px] font-sans font-medium tracking-[0.2em] uppercase text-brand-ink"
        >
          What is this about?
        </label>
        <select
          id="contact-topic"
          className={cn(
            "w-full border border-brand-ivory-deep bg-white px-4 py-3 text-base sm:text-sm font-sans text-brand-ink transition-[border-color,box-shadow] duration-300 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/30",
            errors.topic && "border-brand-wine focus:border-brand-wine focus:ring-brand-wine/25"
          )}
          {...register("topic")}
        >
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
        {errors.topic && (
          <p className="text-xs font-sans text-brand-wine">{errors.topic.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="contact-message"
          className="text-[10px] font-sans font-medium tracking-[0.2em] uppercase text-brand-ink"
        >
          Your message
        </label>
        <textarea
          id="contact-message"
          rows={6}
          maxLength={2000}
          className={cn(
            "w-full resize-y border border-brand-ivory-deep bg-white px-4 py-3 text-base sm:text-sm font-sans leading-relaxed text-brand-ink placeholder:text-[#a89f92] transition-[border-color,box-shadow] duration-300 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/30",
            errors.message && "border-brand-wine focus:border-brand-wine focus:ring-brand-wine/25"
          )}
          placeholder="Tell us what you need — the more detail, the better we can help."
          {...register("message")}
        />
        <div className="flex items-start justify-between gap-4">
          {errors.message ? (
            <p className="text-xs font-sans text-brand-wine">{errors.message.message}</p>
          ) : (
            <span />
          )}
          <p className="shrink-0 text-[11px] font-sans text-brand-grey-dark tabular-nums">
            {messageLength}/2000
          </p>
        </div>
      </div>

      {/* Honeypot. Hidden from sight and from screen readers, and skipped by
          the tab order — anything that fills it is not a person. */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" tabIndex={-1} autoComplete="off" {...register("company")} />
      </div>

      {formError && (
        <p role="alert" className="text-xs font-sans text-brand-wine">
          {formError}
        </p>
      )}

      <Button type="submit" loading={isSubmitting}>
        Send message
      </Button>
    </form>
  );
}
