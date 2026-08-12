"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/account/AccountSection";
import { ReviewForm, StarRating } from "@/components/account/ReviewForm";

export interface ReviewableProduct {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

export interface WrittenReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  product: ReviewableProduct;
}

function Thumb({ product }: { product: ReviewableProduct }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="relative h-20 w-16 shrink-0 overflow-hidden bg-brand-ivory-deep"
    >
      {product.image && (
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="64px"
        />
      )}
    </Link>
  );
}

/**
 * Two lists: pieces the customer has received but not yet reviewed, and the
 * reviews they've already written (editable and deletable).
 */
export function ReviewsManager({
  awaiting,
  written,
}: {
  awaiting: ReviewableProduct[];
  written: WrittenReview[];
}) {
  const router = useRouter();
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setError(null);
    const res = await fetch(`/api/account/reviews/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not delete that review.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-12">
      {error && <p className="text-xs font-sans text-brand-wine">{error}</p>}

      <section>
        <h3 className="mb-4 text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
          Awaiting your review
        </h3>

        {awaiting.length === 0 ? (
          <p className="border border-brand-ivory-deep bg-white p-6 text-[12px] font-sans text-[#888888]">
            Nothing waiting — you&apos;ve reviewed everything that has reached you.
          </p>
        ) : (
          <div className="space-y-4">
            {awaiting.map((product) => (
              <div key={product.id} className="border border-brand-ivory-deep bg-white p-5">
                <div className="flex items-start gap-4">
                  <Thumb product={product} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-[13px] font-sans font-medium text-black hover:text-brand-gold"
                    >
                      {product.name}
                    </Link>
                    {openProductId !== product.id && (
                      <button
                        type="button"
                        onClick={() => setOpenProductId(product.id)}
                        className="mt-2 block text-[10px] font-sans tracking-luxe uppercase text-brand-gold hover:underline"
                      >
                        Write a review
                      </button>
                    )}
                  </div>
                </div>

                {openProductId === product.id && (
                  <div className="mt-4">
                    <ReviewForm
                      productId={product.id}
                      productName={product.name}
                      onDone={() => setOpenProductId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
          Your reviews
        </h3>

        {written.length === 0 ? (
          <EmptyState title="No reviews written yet" />
        ) : (
          <div className="space-y-4">
            {written.map((review) => (
              <div key={review.id} className="border border-brand-ivory-deep bg-white p-5">
                <div className="flex items-start gap-4">
                  <Thumb product={review.product} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${review.product.slug}`}
                      className="text-[13px] font-sans font-medium text-black hover:text-brand-gold"
                    >
                      {review.product.name}
                    </Link>
                    <div className="mt-1">
                      <StarRating value={review.rating} />
                    </div>
                    {review.title && (
                      <p className="mt-2 text-[12px] font-sans font-medium text-black">
                        {review.title}
                      </p>
                    )}
                    <p className="mt-1 text-[12px] font-sans leading-relaxed text-[#666666]">
                      {review.body}
                    </p>

                    <div className="mt-3 flex gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingId(editingId === review.id ? null : review.id)
                        }
                        className="text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
                      >
                        {editingId === review.id ? "Close" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(review.id)}
                        className="text-[10px] font-sans tracking-luxe uppercase text-[#888888] transition-colors hover:text-brand-wine"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {editingId === review.id && (
                  <div className="mt-4">
                    <ReviewForm
                      productId={review.product.id}
                      productName={review.product.name}
                      initial={{ rating: review.rating, title: review.title, body: review.body }}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
