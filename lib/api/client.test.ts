import { describe, it, expect, afterEach } from 'vitest';
import { createApiClient, getDefaultBaseUrl } from './client';

describe('createApiClient', () => {
  it('creates a client with the provided baseUrl', () => {
    const client = createApiClient('http://api.example.com');
    expect(client.auth.getConfig().baseUrl).toBe('http://api.example.com');
  });

  it('creates a client with an optional in-memory access token', () => {
    const client = createApiClient('http://api.example.com', 'acc');
    expect(client.auth.getConfig().accessToken).toBe('acc');
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
    expect(client.clanCategories.getConfig().accessToken).toBe('tok_new');
  });
});

describe('ClashKingApiClient — clearTokens', () => {
  it('clears tokens on all sub-clients', () => {
    const client = createApiClient('http://api.example.com', 'acc');
    client.clearTokens();
    expect(client.auth.getConfig().accessToken).toBeUndefined();
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
    expect(url).toBe(process.env.NEXT_PUBLIC_API_URL || 'https://v2-api.clashk.ing');
  });

  it('uses the API origin directly when running client-side', () => {
    (globalThis as Record<string, unknown>).window = {};
    const url = getDefaultBaseUrl();
    expect(url).toBe(process.env.NEXT_PUBLIC_API_URL || 'https://v2-api.clashk.ing');
  });
});
