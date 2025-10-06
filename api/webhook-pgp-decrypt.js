// /api/webhook-pgp-decrypt.js

const path = require('path');
const { SFTPClient } = require('../lib/sftp');
const { decryptPGPStream } = require('../lib/pgp');
const config = require('../lib/config');
const { verifySignature, getRawBody } = require('../lib/webhook-utils');
const { Readable } = require('stream');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const sigHeader = req.headers['x-hub-signature'];
  const rawBody = await getRawBody(req);
  const isValid = verifySignature(rawBody, sigHeader, config.pgpDecryptHandler.webhookSecret);

  if (!isValid) {
    console.warn('[webhook] Invalid signature');
    return res.status(401).end('Invalid signature');
  }

  const event = JSON.parse(rawBody);
  const rawFilePath = event.Data?.Path;
  if (!rawFilePath) return res.status(400).end('Missing file path');

  // URL decode the file path to handle encoded characters (+ to space, % encoding)
  const filePath = decodeURIComponent(rawFilePath.replace(/\+/g, ' '));
  console.log('[webhook] Processing file:', { rawPath: rawFilePath, decodedPath: filePath });

  try {
    const sftp = new SFTPClient(config.sftp);
    await sftp.connect();
    console.log('[sftp] Connected');

    console.log('[webhook] Downloading file from:', filePath);
    const sourceStream = await sftp.downloadStream(filePath);

    const chunks = [];
    sourceStream.on('data', (chunk) => {
      console.log('[webhook] sourceStream emitted chunk:', chunk.length);
      chunks.push(chunk);
    });

    sourceStream.on('end', async () => {
      console.log('[webhook] sourceStream ended');
      const buffer = Buffer.concat(chunks);
      console.log('[webhook] Downloaded content size:', buffer.length, 'bytes');
      console.log('[webhook] Downloaded content (first 16 bytes as hex):', buffer.slice(0, 16).toString('hex'));

      try {
        const replayStream = Readable.from(buffer);
        const decryptedStream = await decryptPGPStream(
          replayStream,
          config.pgpDecryptHandler.privateKey,
          config.pgpDecryptHandler.passphrase
        );
        console.log('[webhook] Decryption complete');

        // Figure out folder and filename for upload
        const fileName = path.basename(filePath);
        let targetDir;
        if (config.pgpDecryptHandler.upload.relative) {
          targetDir = path.join(path.dirname(filePath), config.pgpDecryptHandler.upload.path);
        } else {
          targetDir = config.pgpDecryptHandler.upload.path;
        }
        const uploadPath = path.join(targetDir, fileName);

        // Ensure the target directory exists
        await sftp.mkdir(targetDir, true);
        console.log('[webhook] Uploading to:', uploadPath);

        await sftp.uploadStream(decryptedStream, uploadPath);
        console.log('[webhook] Upload complete');

        if (config.pgpDecryptHandler.deleteAfterUpload) {
          console.log('[webhook] Deleting source file:', filePath);
          await sftp.deleteFile(filePath);
          console.log('[webhook] Source deleted');
        }

        await sftp.end();
        res.status(200).end('OK');
      } catch (innerErr) {
        console.error('[webhook] Decryption or upload failed:', innerErr);
        res.status(500).end('Decryption or upload error');
      }
    });

    sourceStream.on('error', (err) => {
      console.error('[webhook] sourceStream error:', err.message);
      res.status(500).end('Stream error');
    });

  } catch (err) {
    console.error('Error handling webhook:', err);
    res.status(500).end('Internal Server Error');
  }
};

module.exports.config = {
  api: {
    bodyParser: false
  }
};
