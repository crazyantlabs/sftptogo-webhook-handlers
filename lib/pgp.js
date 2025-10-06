// /lib/pgp.js

const openpgp = require('openpgp');
const { Readable } = require('stream');

// Configure OpenPGP v6 for more flexible key handling
openpgp.config.v6Keys = true; // Enable v6 key format
openpgp.config.minRSABits = 1024; // Allow RSA keys as short as 1024 bits for testing
openpgp.config.rejectPublicKeyAlgorithms = new Set(); // Don't reject any public key algorithms

async function decryptPGPStream(stream, armoredPrivateKey, passphrase) {
  try {
    const inputChunks = [];
    for await (const chunk of stream) {
      inputChunks.push(chunk);
    }

    const inputBuffer = Buffer.concat(inputChunks);
    console.log('[pgp] Input buffer size:', inputBuffer.length, 'bytes');

    // Auto-detect if the input is armored text or binary
    const inputString = inputBuffer.toString('utf8');
    const isArmored = inputString.includes('-----BEGIN PGP MESSAGE-----');
    
    console.log('[pgp] Detected format:', isArmored ? 'armored' : 'binary');
    if (isArmored) {
      console.log('[pgp] Input content (truncated):', inputString.slice(0, 500));
    }

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

    console.log('[pgp] Reading message...');
    let message;
    if (isArmored) {
      message = await openpgp.readMessage({ armoredMessage: inputString });
    } else {
      message = await openpgp.readMessage({ binaryMessage: inputBuffer });
    }
    
    console.log('[pgp] Starting message decryption...');

    const { data: decrypted } = await openpgp.decrypt({
      message,
      decryptionKeys: usableKey,
      format: 'binary' // Ensure we get binary data, not UTF-8 string
    });

    console.log('[pgp] Decryption successful');
    console.log('[pgp] Decrypted data type:', typeof decrypted);
    console.log('[pgp] Decrypted data length:', decrypted.length);
    console.log('[pgp] Decrypted data (first 16 bytes as hex):', Buffer.from(decrypted).slice(0, 16).toString('hex'));
    
    // Ensure we return the data as a proper Buffer
    const decryptedBuffer = Buffer.from(decrypted);
    return Readable.from([decryptedBuffer]);
  } catch (err) {
    console.error('[pgp] Decryption failed:', err);
    throw err;
  }
}

async function encryptPGPStream(stream, armoredPublicKeys, options = {}) {
  try {
    console.log('[pgp] Starting encryption stream...');
    
    // Parse public keys
    const publicKeyStrings = Array.isArray(armoredPublicKeys) 
      ? armoredPublicKeys 
      : [armoredPublicKeys];
    
    const publicKeys = await Promise.all(
      publicKeyStrings.map(keyString => {
        const formattedKey = keyString.replace(/\\n/g, '\n');
        return openpgp.readKey({ armoredKey: formattedKey });
      })
    );
    
    console.log('[pgp] Loaded', publicKeys.length, 'public key(s)');
    
    // Parse signing key if provided
    let signingKey = null;
    if (options.signPrivateKey && options.signPassphrase) {
      console.log('[pgp] Loading signing key...');
      const formattedSignKey = options.signPrivateKey.replace(/\\n/g, '\n');
      const privateKey = await openpgp.readPrivateKey({ armoredKey: formattedSignKey });
      
      if (!privateKey.isDecrypted()) {
        signingKey = await openpgp.decryptKey({ 
          privateKey, 
          passphrase: options.signPassphrase 
        });
      } else {
        signingKey = privateKey;
      }
      console.log('[pgp] Signing key loaded');
    }
    
    // Collect stream data
    const inputChunks = [];
    for await (const chunk of stream) {
      inputChunks.push(chunk);
    }
    
    const inputData = Buffer.concat(inputChunks);
    console.log('[pgp] Input data size:', inputData.length, 'bytes');
    
    // Encrypt the data with v6 API
    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ binary: inputData }),
      encryptionKeys: publicKeys,
      signingKeys: signingKey,
      format: options.asciiArmor ? 'armored' : 'binary'
    });
    
    console.log('[pgp] Encryption successful');
    return Readable.from([encrypted]);
  } catch (err) {
    console.error('[pgp] Encryption failed:', err);
    throw err;
  }
}

module.exports = {
  decryptPGPStream,
  encryptPGPStream
};
