"use client";

// Swiper-based carousel for marketing sections. Keyboard arrows, swipe and bullet buttons
// are provided by Swiper; the prev/next buttons and their labels are rendered here so the
// markup is identical on the server and in the browser. Swiper's own a11y module is not
// used: it constructs a Date when it loads, which breaks static prerendering of the page.
import "swiper/css";
import "swiper/css/pagination";
import { useState, type ReactNode } from "react";
import { Keyboard, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper/types";

export type SliderLabels = {
  prev: string;
  next: string;
  /** Use `{{index}}` where the slide number belongs, e.g. "Go to slide {{index}}". */
  bullet: string;
};

export type SliderBreakpoints = Record<number, { slidesPerView: number; spaceBetween?: number }>;

export type SliderItem = { key: string; node: ReactNode };

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function MarketingSlider({
  label,
  labels,
  items,
  slidesPerView = 1.1,
  spaceBetween = 16,
  breakpoints,
  className,
}: {
  /** Accessible name of the region, e.g. the section heading. */
  label: string;
  labels: SliderLabels;
  items: SliderItem[];
  slidesPerView?: number;
  spaceBetween?: number;
  breakpoints?: SliderBreakpoints;
  className?: string;
}) {
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [locked, setLocked] = useState(false);

  const sync = (s: SwiperInstance) => {
    setAtStart(s.isBeginning);
    setAtEnd(s.isEnd);
    setLocked(s.isLocked);
  };

  const total = items.length;

  return (
    <div
      className={`pm-slider${className ? ` ${className}` : ""}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <Swiper
        modules={[Keyboard, Pagination]}
        className="pm-slider-swiper"
        slidesPerView={slidesPerView}
        spaceBetween={spaceBetween}
        breakpoints={breakpoints}
        watchOverflow
        pagination={{
          clickable: true,
          renderBullet: (index, className) =>
            `<button type="button" class="${className}" aria-label="${escapeAttr(
              labels.bullet.replace("{{index}}", String(index + 1)),
            )}"></button>`,
        }}
        keyboard={{ enabled: true, onlyInViewport: true }}
        onSwiper={(s) => {
          setSwiper(s);
          sync(s);
        }}
        onSlideChange={sync}
        onResize={sync}
        onBreakpoint={sync}
      >
        {items.map((item, idx) => (
          <SwiperSlide
            key={item.key}
            className="pm-slider-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} / ${total}`}
          >
            {item.node}
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="pm-slider-nav" hidden={locked}>
        <button
          type="button"
          className="pm-slider-btn is-prev"
          aria-label={labels.prev}
          disabled={!swiper || atStart}
          onClick={() => swiper?.slidePrev()}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12.5 4.5L7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          className="pm-slider-btn is-next"
          aria-label={labels.next}
          disabled={!swiper || atEnd}
          onClick={() => swiper?.slideNext()}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M7.5 4.5L13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
