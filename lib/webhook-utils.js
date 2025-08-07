// lib/webhook-utils.js

const crypto = require('crypto');

function verifySignature(body, headerSig, webhookSecret) {
  if (!headerSig || !webhookSecret) {
    console.warn('[verifySignature] Missing signature or secret');
    return false;
  }
  const expectedPrefix = 'sha256=';
  const computedSig = expectedPrefix + crypto.createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');
  console.log('[verifySignature] Provided signature:', headerSig);
  console.log('[verifySignature] Computed signature:', computedSig);
  return safeCompare(headerSig, computedSig);
}

function safeCompare(a, b) {
  const strA = String(a);
  const strB = String(b);

  const aLen = Buffer.byteLength(strA);
  const bLen = Buffer.byteLength(strB);

  const bufA = Buffer.alloc(aLen, 0, 'utf8');
  bufA.write(strA);

  const bufB = Buffer.alloc(aLen, 0, 'utf8');
  bufB.write(strB);

  return crypto.timingSafeEqual(bufA, bufB) && aLen === bLen;
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = {
  verifySignature,
  safeCompare,
  getRawBody,
};
