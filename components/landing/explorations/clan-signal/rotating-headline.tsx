"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type RotatingHeadlineProps = {
  phrases: readonly (readonly string[])[];
  label: string;
};

export function RotatingHeadline({ phrases, label }: Readonly<RotatingHeadlineProps>) {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const measuredWords = Array.from(
      heading.querySelectorAll<HTMLElement>("[data-headline-measure-word]"),
    );

    const fitHeadline = () => {
      const availableWidth = heading.clientWidth;
      const widestWord = Math.max(...measuredWords.map((word) => word.getBoundingClientRect().width));
      const baseSize = Number.parseFloat(getComputedStyle(measuredWords[0]).fontSize);

      if (!availableWidth || !widestWord || !baseSize) return;

      const fittedSize = baseSize * Math.min(1, availableWidth / widestWord);
      heading.style.setProperty("--cs-headline-fitted-size", `${fittedSize}px`);
    };

    fitHeadline();
    const resizeObserver = new ResizeObserver(fitHeadline);
    resizeObserver.observe(heading);
    void document.fonts?.ready.then(fitHeadline);

    return () => resizeObserver.disconnect();
  }, [phrases]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setIsVisible(false);
      timeoutRef.current = window.setTimeout(() => {
        setIndex((current) => (current + 1) % phrases.length);
        setIsVisible(true);
      }, 240);
    }, 4320);

    return () => {
      window.clearInterval(interval);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [phrases]);

  const phrase = phrases[index];

  return (
    <h1 ref={headingRef} id="cs-hero-title" aria-label={label}>
      <span className={`cs-headline-phrase${isVisible ? "" : " is-hidden"}`} aria-hidden="true">
        {phrase.map((word) => <span key={word}>{word}</span>)}
      </span>
      <span className="cs-headline-measure" aria-hidden="true">
        {phrases.flat().map((word, wordIndex) => (
          <span key={`${word}-${wordIndex}`} data-headline-measure-word>{word}</span>
        ))}
      </span>
    </h1>
  );
}
