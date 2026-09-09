import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/pkce', () => ({
  generateCodeVerifier: vi.fn().mockReturnValue('mock_verifier_abc123'),
  generateCodeChallenge: vi.fn().mockResolvedValue('mock_challenge_xyz'),
}));

import { initiateDiscordLogin } from './discord-login';

describe('initiateDiscordLogin', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://dash.clashk.ing', href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  it('stores code_verifier in sessionStorage', async () => {
    await initiateDiscordLogin('en');
    expect(sessionStorage.getItem('discord_code_verifier')).toBe('mock_verifier_abc123');
  });

  it('moves marketing login to the dashboard before generating origin-bound state', async () => {
    Object.defineProperty(window, 'location', { value: { origin: 'https://clashk.ing', href: '' }, configurable: true });
    await initiateDiscordLogin('en');
    expect(window.location.href).toBe('https://dash.clashk.ing/login');
    expect(sessionStorage.getItem('discord_code_verifier')).toBeNull();
    expect(sessionStorage.getItem('discord_oauth_state')).toBeNull();
    const dashboardOrigin = new URL(window.location.href).origin;
    Object.defineProperty(window, 'location', { value: { origin: dashboardOrigin, href: '' }, configurable: true });
    await initiateDiscordLogin('en');
    expect(new URL(window.location.href).searchParams.get('redirect_uri')).toBe('https://dash.clashk.ing/auth/callback');
    expect(sessionStorage.getItem('discord_code_verifier')).toBe('mock_verifier_abc123');
  });

  it('stores the locale in sessionStorage', async () => {
    await initiateDiscordLogin('fr');
    expect(sessionStorage.getItem('auth_locale')).toBe('fr');
  });

  it('defaults locale to en', async () => {
    await initiateDiscordLogin();
    expect(sessionStorage.getItem('auth_locale')).toBe('en');
  });

  it('redirects to a discord.com OAuth URL', async () => {
    await initiateDiscordLogin('en');
    expect(window.location.href).toContain('discord.com');
    expect(window.location.href).toContain('code_challenge=mock_challenge_xyz');
    expect(window.location.href).toContain('code_challenge_method=S256');
  });

  it('initiates local login with the configured public ID and exact local callback', async () => {
    vi.stubEnv('VITE_DISCORD_CLIENT_ID', '824653933347209227');
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3002', hostname: 'localhost', href: '' },
      configurable: true,
    });
    await initiateDiscordLogin('en');
    const authorization = new URL(window.location.href);
    expect(authorization.origin).toBe('https://discord.com');
    expect(authorization.searchParams.get('client_id')).toBe('824653933347209227');
    expect(authorization.searchParams.get('redirect_uri')).toBe('http://localhost:3002/auth/callback');
    expect(authorization.searchParams.get('state')).toBe(sessionStorage.getItem('discord_oauth_state'));
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('calls alert and logs error when client ID is missing', async () => {
    vi.stubEnv('VITE_DISCORD_CLIENT_ID', '');
    await initiateDiscordLogin('en');
    expect(console.error).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalled();
  });
});
