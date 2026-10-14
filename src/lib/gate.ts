// Verrou d'accès par mot de passe, côté navigateur.
// L'empreinte attendue (PBKDF2-SHA-256) est fournie au build par VITE_ACCESS_HASH ; sans elle, l'accès est libre.
// Dissuasif seulement : l'empreinte est dans le bundle et les fichiers /packs/ restent publics.

const SALT = 'ups-onsite-maintenance/v1';
const ITERATIONS = 150_000;
const STORAGE_KEY = 'ups-access';

export const expectedHash: string = (import.meta.env.VITE_ACCESS_HASH as string | undefined)?.trim().toLowerCase() ?? '';

export async function hashPassword(password: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(SALT), iterations: ITERATIONS },
    key,
    256,
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compare deux chaînes hexadécimales sans court-circuit. */
export function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isRemembered(): boolean {
  try {
    return !!expectedHash && localStorage.getItem(STORAGE_KEY) === expectedHash;
  } catch {
    return false;
  }
}

export function remember(): void {
  try { localStorage.setItem(STORAGE_KEY, expectedHash); } catch { /* stockage indisponible : on redemandera */ }
}

export function forget(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignoré */ }
}
