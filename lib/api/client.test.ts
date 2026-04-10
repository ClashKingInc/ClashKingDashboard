import { describe, it, expect, afterEach } from 'vitest';
import { createApiClient, getDefaultBaseUrl } from './client';

describe('createApiClient', () => {
  it('creates a client with the provided baseUrl', () => {
    const client = createApiClient('http://api.example.com');
    expect(client.auth.getConfig().baseUrl).toBe('http://api.example.com');
  });

  it('creates a client with optional access and refresh tokens', () => {
    const client = createApiClient('http://api.example.com', 'acc', 'ref');
    expect(client.auth.getConfig().accessToken).toBe('acc');
    expect(client.auth.getConfig().refreshToken).toBe('ref');
  });
});

describe('ClashKingApiClient — setAccessToken', () => {
  it('propagates the token to all sub-clients', () => {
    const client = createApiClient('http://api.example.com');
    client.setAccessToken('tok_new');
    expect(client.auth.getConfig().accessToken).toBe('tok_new');
    expect(client.players.getConfig().accessToken).toBe('tok_new');
    expect(client.clans.getConfig().accessToken).toBe('tok_new');
    expect(client.rosters.getConfig().accessToken).toBe('tok_new');
    expect(client.wars.getConfig().accessToken).toBe('tok_new');
    expect(client.servers.getConfig().accessToken).toBe('tok_new');
    expect(client.links.getConfig().accessToken).toBe('tok_new');
    expect(client.utils.getConfig().accessToken).toBe('tok_new');
    expect(client.roles.getConfig().accessToken).toBe('tok_new');
    expect(client.familyRoles.getConfig().accessToken).toBe('tok_new');
    expect(client.leaderboards.getConfig().accessToken).toBe('tok_new');
    expect(client.tickets.getConfig().accessToken).toBe('tok_new');
    expect(client.panels.getConfig().accessToken).toBe('tok_new');
  });
});

describe('ClashKingApiClient — setRefreshToken', () => {
  it('propagates the refresh token to all sub-clients', () => {
    const client = createApiClient('http://api.example.com');
    client.setRefreshToken('ref_new');
    expect(client.auth.getConfig().refreshToken).toBe('ref_new');
    expect(client.players.getConfig().refreshToken).toBe('ref_new');
    expect(client.rosters.getConfig().refreshToken).toBe('ref_new');
  });
});

describe('ClashKingApiClient — clearTokens', () => {
  it('clears tokens on all sub-clients', () => {
    const client = createApiClient('http://api.example.com', 'acc', 'ref');
    client.clearTokens();
    expect(client.auth.getConfig().accessToken).toBeUndefined();
    expect(client.auth.getConfig().refreshToken).toBeUndefined();
    expect(client.players.getConfig().accessToken).toBeUndefined();
    expect(client.rosters.getConfig().accessToken).toBeUndefined();
  });
});

describe('ClashKingApiClient — getConfig', () => {
  it('returns the baseUrl from the auth client', () => {
    const client = createApiClient('http://api.example.com');
    expect(client.getConfig().baseUrl).toBe('http://api.example.com');
  });
});

describe('getDefaultBaseUrl', () => {
  afterEach(() => {
    // Restore window to undefined (Node.js / test environment default)
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('returns backend URL when running server-side (window undefined)', () => {
    Reflect.deleteProperty(globalThis, 'window');
    const url = getDefaultBaseUrl();
    expect(url).toBe(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
  });

  it('returns /api when running client-side (window defined)', () => {
    (globalThis as Record<string, unknown>).window = {};
    const url = getDefaultBaseUrl();
    expect(url).toBe('/api');
  });
});
