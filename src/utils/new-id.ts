/**
 * UUID v4 generation that works everywhere the app runs.
 *
 * crypto.randomUUID is only exposed in secure contexts (https, localhost).
 * Opening the dev server from a tablet over LAN (http://192.168.x.x) is an
 * insecure context, so an import there would throw mid-transaction and surface
 * as a generic failure. The fallback builds the same v4 UUID from
 * crypto.getRandomValues, which has no such restriction.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const b6 = bytes[6] ?? 0;
  const b8 = bytes[8] ?? 0;
  bytes[6] = (b6 & 0x0f) | 0x40; // version 4
  bytes[8] = (b8 & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
