/**
 * Device ID management for auth flows.
 * A stable per-browser UUID sent to the backend so refresh tokens can be
 * scoped to a device.
 */

const DEVICE_ID_STORAGE_KEY = "device_id";

function generateUuidV4(): string {
  // crypto.randomUUID() requires a secure context (HTTPS or localhost)
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: crypto.getRandomValues is available in all contexts
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Get the device ID for this browser, generating and persisting one if needed.
 * Returns null outside the browser (SSR).
 */
export function getOrCreateDeviceId(): string | null {
  if (globalThis.window === undefined) {
    return null;
  }

  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!deviceId) {
    deviceId = generateUuidV4();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }
  return deviceId;
}
