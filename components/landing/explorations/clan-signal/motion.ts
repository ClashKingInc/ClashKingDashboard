import { useCallback, useEffect, useRef, useState } from 'react';
export function useLandingMotion() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const permitted = useRef(true);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener('change', update);
    try { setPaused(localStorage.getItem('clashking-landing-motion') === 'paused'); } catch { /* Storage is optional. */ }
    return () => query.removeEventListener('change', update);
  }, []);
  permitted.current = !paused && !reduced;
  const canMove = useCallback(() => permitted.current && !matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const toggle = () => setPaused(value => {
    try { localStorage.setItem('clashking-landing-motion', !value ? 'paused' : 'enabled'); } catch { /* Storage is optional. */ }
    return !value;
  });
  return { paused, reduced, canMove, toggle, enabled: !paused && !reduced };
}
