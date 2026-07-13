"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  /** Stagger delay in milliseconds, applied via inline transition-delay. */
  delayMs?: number;
  className?: string;
}

/**
 * Wraps its children and reveals them with a fade + slide-up animation the
 * first time they scroll into the viewport. Uses IntersectionObserver
 * rather than a scroll listener for performance, and only fires once per
 * element (unobserves itself after revealing) so re-scrolling past a
 * section doesn't replay the animation repeatedly.
 */
export function ScrollReveal({ children, delayMs = 0, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: isVisible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
