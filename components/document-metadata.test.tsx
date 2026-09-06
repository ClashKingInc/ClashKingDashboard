import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentMetadata } from './document-metadata';

const route = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('@tanstack/react-router', () => ({ useLocation: ({ select }: { select: (location: typeof route) => unknown }) => select(route) }));

describe('metadata ownership across static shells and client navigation', () => {
  afterEach(() => { document.head.innerHTML = ''; route.pathname = '/'; });
  it('replaces generated metadata and updates it once per route', () => {
    document.head.innerHTML = '<link rel="canonical" href="https://clashk.ing/"><meta property="og:url" content="https://clashk.ing/"><meta name="twitter:title" content="Old home">';
    const view = render(<DocumentMetadata />);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    route.pathname = '/fr/privacy';
    view.rerender(<DocumentMetadata />);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://clashk.ing/fr/privacy');
    expect(document.head.querySelectorAll('meta[property="og:url"]')).toHaveLength(1);
    expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://clashk.ing/fr/privacy');
    route.pathname = '/dashboard';
    view.rerender(<DocumentMetadata />);
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
  });
});
