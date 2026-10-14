// Calcule l'empreinte du mot de passe d'accès à placer dans VITE_ACCESS_HASH.
// Usage : node tools/hash-password.mjs   (le mot de passe est demandé sans écho)
import { webcrypto as crypto } from 'node:crypto';
import readline from 'node:readline';

const SALT = 'ups-onsite-maintenance/v1';
const ITERATIONS = 150_000;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = (s) => { if (s.includes('Mot de passe')) process.stdout.write(s); };
rl.question('Mot de passe : ', async (pw) => {
  rl.close();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(SALT), iterations: ITERATIONS }, key, 256);
  console.log('\nVITE_ACCESS_HASH=' + [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join(''));
});
