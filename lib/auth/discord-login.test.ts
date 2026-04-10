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
      value: { origin: 'https://dashboard.clashk.ing', href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('stores code_verifier in sessionStorage', async () => {
    await initiateDiscordLogin('en');
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

  it('calls alert and logs error when client ID is missing', async () => {
    const originalId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    await initiateDiscordLogin('en');
    expect(console.error).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalled();
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID = originalId;
  });
});
