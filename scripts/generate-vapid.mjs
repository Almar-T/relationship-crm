#!/usr/bin/env node
/**
 * Generates a VAPID key pair for Web Push using Node's Web Crypto — no external
 * dependencies. Prints the values you need and writes them to vapid-keys.json
 * (gitignored). Run once:  `npm run generate:vapid`
 */
import { webcrypto } from 'node:crypto';
import { writeFileSync } from 'node:fs';

function base64url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify'],
);

const privateJwk = await webcrypto.subtle.exportKey('jwk', privateKey);
const rawPublic = await webcrypto.subtle.exportKey('raw', publicKey); // 65-byte uncompressed point
const publicKeyB64 = base64url(rawPublic);
const privateJwkString = JSON.stringify(privateJwk);

const out = {
  VITE_VAPID_PUBLIC_KEY: publicKeyB64,
  VAPID_PRIVATE_JWK: privateJwkString,
};

writeFileSync(new URL('../vapid-keys.json', import.meta.url), JSON.stringify(out, null, 2));

console.log('\n✅ VAPID keys generated (also saved to vapid-keys.json)\n');
console.log('── Frontend (.env) ─────────────────────────────────────────');
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKeyB64}\n`);
console.log('── Cloudflare Worker secret ────────────────────────────────');
console.log('Run this and paste the private JWK when prompted:');
console.log('  wrangler secret put VAPID_PRIVATE_JWK');
console.log('\nPrivate JWK value:');
console.log(privateJwkString);
console.log('\nAlso set the public key as a secret (used in push headers):');
console.log('  wrangler secret put VAPID_PUBLIC_KEY');
console.log(`Value: ${publicKeyB64}\n`);
