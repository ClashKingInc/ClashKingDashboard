"use client";
import { useEffect, useRef } from 'react';
import { useTranslations } from 'use-intl';

export function ClanSignalHeroModel({ canMove }: { canMove: () => boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const t = useTranslations('ClanSignal');
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const abort = new AbortController();
    let dispose: (() => void) | undefined;
    // Keep Three and the SC3D decoder out of the initial page bundle.
    void import('./logger/mount').then(({ mountLogger }) => mountLogger(element, canMove, abort.signal)).then(cleanup => {
      if (abort.signal.aborted) cleanup(); else dispose = cleanup;
    }).catch(() => { if (!abort.signal.aborted) element.dataset.model = 'fallback'; });
    return () => { abort.abort(); dispose?.(); };
  }, [canMove]);
  return <div ref={host} className="ck-logger" aria-label={t('rally.modelLabel')}><img src="/landing/logger/fallback.webp" width="840" height="901" alt={t('rally.modelName')} /></div>;
}
