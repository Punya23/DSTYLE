"use client";

import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { isVideoUrl } from "@/lib/media";
import { MediaPlaceholder } from "@/components/store/MediaPlaceholder";
import { ViewTransition } from "@/lib/view-transition";
import type { ProductImage } from "@/types";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  transitionName?: string;
}

function GalleryMedia({
  url,
  alt,
  priority,
  className,
  sizes,
}: {
  url: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        autoPlay
        muted
        loop
        playsInline
        className={className ?? "absolute inset-0 w-full h-full object-cover object-center"}
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      fill
      className={className ?? "object-cover"}
      sizes={sizes ?? "(max-width: 1024px) 100vw, 50vw"}
      priority={priority}
    />
  );
}

export function ProductGallery({ images, productName, transitionName }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = useRef(0);

  const goTo = (index: number) =>
    setSelected((index + images.length) % images.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 40) return;
    if (diff > 0) goTo(selected + 1);
    else goTo(selected - 1);
  };

  const openLightbox = (index: number) => {
    if (isVideoUrl(images[index]?.url ?? "")) return;
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  }, []);

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] overflow-hidden">
        <MediaPlaceholder className="w-full h-full" />
      </div>
    );
  }

  const current = images[selected];
  const isVideo = isVideoUrl(current.url);

  return (
    <>
      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        {/* Main */}
        <ViewTransition name={transitionName} share="morph">
        <div
          className={`relative w-full flex-1 aspect-[3/4] md:aspect-[4/5] lg:aspect-[3/4] bg-brand-ivory-deep overflow-hidden touch-pan-y ${
            isVideo ? "" : "cursor-zoom-in group"
          }`}
          onClick={() => openLightbox(selected)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              <GalleryMedia
                url={current.url}
                alt={current.altText ?? productName}
                priority
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </motion.div>
          </AnimatePresence>

          {images.length > 1 && (
            <>
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 text-[10px] font-sans tracking-widest uppercase text-white z-10">
                {selected + 1} / {images.length}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(selected - 1);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
                aria-label="Previous"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(selected + 1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
                aria-label="Next"
              >
                <ChevronRight size={18} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(i);
                    }}
                    className={`h-1 rounded-full transition-all ${
                      i === selected ? "w-5 bg-white" : "w-1.5 bg-white/50"
                    }`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        </ViewTransition>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[520px] lg:max-h-[600px] hide-scrollbar shrink-0 md:w-[72px] lg:w-20 pb-1 md:pb-0 md:order-first">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelected(i)}
                className={`relative shrink-0 h-[72px] w-[58px] sm:h-20 sm:w-16 overflow-hidden border-2 transition-colors duration-300 ${
                  selected === i ? "border-brand-gold" : "border-brand-ivory-deep hover:border-brand-champagne"
                }`}
                aria-label={`View ${i + 1}`}
              >
                {isVideoUrl(img.url) ? (
                  <video
                    src={img.url}
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={img.url}
                    alt={img.altText ?? `${productName} ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <button
              type="button"
              className="absolute top-4 right-4 p-3 text-white/70 hover:text-white min-h-[44px] min-w-[44px]"
              onClick={closeLightbox}
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <button
              type="button"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 text-white/70"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous"
            >
              <ChevronLeft size={28} />
            </button>
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-lg aspect-[3/4]"
              onClick={(e) => e.stopPropagation()}
            >
              <GalleryMedia
                url={images[lightboxIndex].url}
                alt={images[lightboxIndex].altText ?? productName}
                className="object-contain"
                sizes="90vw"
              />
            </motion.div>
            <button
              type="button"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 text-white/70"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next"
            >
              <ChevronRight size={28} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
