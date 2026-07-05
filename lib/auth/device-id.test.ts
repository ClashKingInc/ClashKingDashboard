import { describe, it, expect, beforeEach } from 'vitest';
import { getOrCreateDeviceId } from './device-id';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('getOrCreateDeviceId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates and persists a UUID v4 when none exists', () => {
    const deviceId = getOrCreateDeviceId();
    expect(deviceId).toMatch(UUID_V4_REGEX);
    expect(localStorage.getItem('device_id')).toBe(deviceId);
  });

  it('returns the existing device ID on subsequent calls', () => {
    const first = getOrCreateDeviceId();
    const second = getOrCreateDeviceId();
    expect(second).toBe(first);
  });

  it('reuses a device ID already present in localStorage', () => {
    localStorage.setItem('device_id', 'existing-device-id');
    expect(getOrCreateDeviceId()).toBe('existing-device-id');
  });
});
