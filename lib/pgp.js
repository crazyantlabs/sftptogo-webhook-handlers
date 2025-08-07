// /lib/pgp.js

const openpgp = require('openpgp');
const { Readable } = require('stream');

async function decryptPGPStream(stream, armoredPrivateKey, passphrase) {
  try {
    const inputChunks = [];
    for await (const chunk of stream) {
      inputChunks.push(chunk);
    }

    const armoredMessage = Buffer.concat(inputChunks).toString('utf8');
    console.log('[pgp] Input content (truncated):', armoredMessage.slice(0, 500));

    console.log('[pgp] Reading private key...');
    const formattedKey = armoredPrivateKey.replace(/\\n/g, '\n');
    console.log('[pgp] Private key (truncated):', formattedKey.slice(0, 100));

    const privateKey = await openpgp.readPrivateKey({ armoredKey: formattedKey });
    console.log('[pgp] Private key read successfully');
    console.log('[pgp] Private key type:', privateKey.getAlgorithmInfo().algorithm);
    console.log('[pgp] Private key is encrypted:', privateKey.isDecrypted() === false);

    let usableKey = privateKey;

    if (privateKey.isDecrypted() === false) {
      console.log('[pgp] Passphrase (raw):', JSON.stringify(passphrase));
      console.log('[pgp] Attempting to decrypt private key with passphrase');
      usableKey = await openpgp.decryptKey({ privateKey, passphrase });
      console.log('[pgp] Private key decrypted');
    } else {
      console.log('[pgp] Private key is already decrypted');
    }

    console.log('[pgp] Sanitizing input...');
    const message = await openpgp.readMessage({ armoredMessage });
    console.log('[pgp] Starting message decryption...');

    const { data: decrypted } = await openpgp.decrypt({
      message,
      decryptionKeys: usableKey
    });

    console.log('[pgp] Decryption successful');
    return Readable.from([decrypted]);
  } catch (err) {
    console.error('[pgp] Decryption failed:', err);
    throw err;
  }
}

module.exports = {
  decryptPGPStream
};
