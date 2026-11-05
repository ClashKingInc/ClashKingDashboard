import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { DashboardQueryProvider } from '@/components/dashboard/dashboard-query-provider';
import { useQuery } from '@tanstack/react-query';
import { BotCountsEndpoint } from '@clashking/api-contracts';
import { createApiClient, httpTransport } from '@clashking/api-client';
import { Effect } from 'effect';
import { readBrowserRuntimeConfig } from '@/lib/runtime-config';

// Public counts never require login or trigger the session refresh flow.
const publicClient = createApiClient({ baseUrl: readBrowserRuntimeConfig().apiOrigin, transport: httpTransport(), credentials: 'omit' });

function Counter({ value, canMove }: { value: number; canMove: () => boolean }) {
  const locale = useLocale();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !canMove()) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      element.querySelectorAll<HTMLElement>('.ck-digit-track').forEach((track, index) => {
        animations.push(track.animate([{ transform: 'translateY(0)' }, { transform: `translateY(-${track.dataset.steps}em)` }], { duration: 1000 + index * 35, delay: index * 24, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
      });
    }, { threshold: .65 });
    observer.observe(element);
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); };
  }, [value, canMove]);
  const text = value.toLocaleString(locale);
  return <strong ref={ref} aria-label={text}>{Array.from(text).map((character, index) => {
    if (!/[0-9]/.test(character)) return <span key={index} aria-hidden="true">{character}</span>;
    const steps = 10 + Number(character);
    return <span key={index} className="ck-digit" aria-hidden="true"><span className="ck-digit-track" data-steps={steps * 1.14} style={{ transform: `translateY(-${steps * 1.14}em)` }}>{Array.from({ length: steps + 1 }, (_, digit) => <i key={digit}>{digit % 10}</i>)}</span></span>;
  })}</strong>;
}
function CountsContent({ canMove }: { canMove: () => boolean }) {
  const t = useTranslations('ClanSignal');
  const { data } = useQuery({ queryKey: ['public', 'global-counts'], queryFn: async ({ signal }) => {
    return Effect.runPromise(publicClient.execute(BotCountsEndpoint, { path: {}, query: {}, body: {} }, { signal }));
  }, staleTime: 10 * 60_000, retry: 1 });
  // An unavailable API must not turn the saved proposal snapshot into purported live counts.
  if (!data) return null;
  const metrics = [
    { value: data.wars_stored, label: t('rally.wars'), icon: '/landing/wars.png' },
    { value: data.player_count, label: t('rally.players'), icon: '/landing/players.webp' },
    { value: data.clan_count, label: t('rally.clans'), icon: '/landing/clans.png' },
  ];
  return <section className="ck-counts ck-wrap" aria-label={t('rally.countsLabel')}>{metrics.map(metric => <div className="ck-stat" key={metric.label}><img src={metric.icon} width="46" height="50" alt="" /><div><Counter value={metric.value} canMove={canMove} /><span>{metric.label}</span></div></div>)}</section>;
}

export function LandingCounts({ canMove }: { canMove: () => boolean }) {
  return <DashboardQueryProvider><CountsContent canMove={canMove} /></DashboardQueryProvider>;
}
