import { describe, expect, it } from 'vitest';
import { canonicalDashboardHref } from './dashboard-origin';

describe('canonical dashboard navigation', () => {
  it('moves all marketing application entry points, preserving query and hash', () => {
    for (const path of ['/login', '/auth/callback', '/servers', '/dashboard/rosters']) {
      expect(canonicalDashboardHref(`${path}?guild=123#details`, 'https://clashk.ing/fr')).toBe(`https://dash.clashk.ing${path}?guild=123#details`);
    }
  });
  it('keeps public, dashboard, local and unrelated external links unchanged', () => {
    expect(canonicalDashboardHref('/privacy', 'https://clashk.ing')).toBe('/privacy');
    expect(canonicalDashboardHref('/login', 'https://dash.clashk.ing')).toBe('/login');
    expect(canonicalDashboardHref('/login', 'http://localhost:3002')).toBe('/login');
    expect(canonicalDashboardHref('https://example.test/login', 'https://clashk.ing')).toBe('https://example.test/login');
  });
});
