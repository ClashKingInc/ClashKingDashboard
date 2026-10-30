"use client";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
export function Scribble() { return <svg viewBox="0 0 270 20" aria-hidden="true"><path d="M4 14C72 1 171 2 264 9M34 18C120 10 177 8 235 13" /></svg>; }
export function SectionTitle({ text }: { text: string }) {
  const split = text.lastIndexOf(' ');
  return <>{split < 0 ? '' : text.slice(0, split + 1)}<span className="section-scribble">{text.slice(split + 1)}<Scribble /></span></>;
}
export function RotatingHeadline({ phrases, label, canMove }: { phrases: readonly (readonly string[])[]; label: string; canMove: () => boolean }) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const animation = useRef<Animation | null>(null);
  const phraseKey = JSON.stringify(phrases);
  useEffect(() => { setIndex(0); }, [phraseKey]);
  useLayoutEffect(() => {
    const element = heading.current;
    if (!element) return;
    const fit = () => {
      element.style.fontSize = '';
      const width = element.clientWidth;
      const lines = element.querySelectorAll<HTMLElement>('.ck-line-inner');
      const widest = Math.max(...Array.from(lines, line => line.scrollWidth));
      if (widest > width) element.style.fontSize = `${parseFloat(getComputedStyle(element).fontSize) * width / widest}px`;
    };
    const observer = new ResizeObserver(fit); observer.observe(element.parentElement!);
    fit(); void document.fonts.ready.then(fit);
    return () => observer.disconnect();
  }, [index, phraseKey]);
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!canMove() || document.hidden || !word.current || (heading.current?.getBoundingClientRect().bottom ?? 0) < 0) return;
      const target = word.current;
      animation.current = target.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-60%)' }], { duration: 180, easing: 'ease-in' });
      void animation.current.finished.then(() => {
        if (canMove()) setIndex(value => (value + 1) % phrases.length);
      }).catch(() => {});
    }, 4200);
    return () => { clearInterval(interval); animation.current?.cancel(); };
  }, [canMove, phraseKey, phrases.length]);
  useLayoutEffect(() => {
    if (canMove()) animation.current = word.current?.animate([{ opacity: 0, transform: 'translateY(60%)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' }) ?? null;
  }, [index, canMove]);
  const phrase = phrases[index % phrases.length];
  return <h1 ref={heading} className="ck-headline" aria-label={label}>
    <span className="ck-line" aria-hidden="true"><span className="ck-line-inner">{phrase[0]}</span></span>
    <span className="ck-line" aria-hidden="true"><span className="ck-line-inner">{phrase[1]} <em><span ref={word}>{phrase[2]}</span><Scribble /></em>.</span></span>
  </h1>;
}
