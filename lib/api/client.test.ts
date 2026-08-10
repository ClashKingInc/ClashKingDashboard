import { describe, it, expect } from 'vitest';
import { createApiClient, getDefaultBaseUrl, getDevelopmentBaseUrl } from './client';

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
  it('uses the configured local API during tests', () => {
    expect(getDefaultBaseUrl()).toBe('http://localhost:8000');
  });

  it('uses direct localhost services for local development', () => {
    expect(getDevelopmentBaseUrl('localhost')).toBe('http://localhost:8000');
  });

  it('uses the local API tunnel for staging', () => {
    expect(getDevelopmentBaseUrl('dev-dash.clashk.ing')).toBe('https://dev-api.clashk.ing');
  });
});
