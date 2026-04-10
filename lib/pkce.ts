/**
 * PKCE (Proof Key for Code Exchange) utilities
 * More secure than basic OAuth2 flow
 */

/**
 * Generate a random code verifier (43-128 characters)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode (without padding)
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCodePoint(...buffer));
  return base64
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
