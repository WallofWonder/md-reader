/**
 * Decode as UTF-8 when the bytes are valid UTF-8, otherwise with `fallback`.
 * Servers that omit charset (e.g. JetBrains built-in server) leave Chrome to
 * guess by locale, which reads UTF-8 docs as GBK on Chinese systems.
 */
export function decodeText(buf: ArrayBuffer, fallback?: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder(fallback).decode(buf)
  }
}

export async function fetchText(url: string, fallback?: string) {
  const res = await fetch(url)
  return decodeText(await res.arrayBuffer(), fallback)
}
