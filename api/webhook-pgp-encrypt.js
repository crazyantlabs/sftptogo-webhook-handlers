// /api/webhook-pgp-encrypt.js

const path = require('path');
const { SFTPClient } = require('../lib/sftp');
const { encryptPGPStream } = require('../lib/pgp');
const config = require('../lib/config');
const { verifySignature, getRawBody } = require('../lib/webhook-utils');
const { Readable } = require('stream');
const { minimatch } = require('minimatch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const operationId = `encrypt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log(`[${operationId}] Starting PGP encryption webhook handler`);

  const sigHeader = req.headers['x-hub-signature'];
  const rawBody = await getRawBody(req);
  const isValid = verifySignature(rawBody, sigHeader, config.pgpEncryptHandler.webhookSecret);

  if (!isValid) {
    console.warn(`[${operationId}] Invalid signature`);
    return res.status(401).end('Invalid signature');
  }

  const event = JSON.parse(rawBody);
  const rawFilePath = event.Data?.Path;
  const eventId = event.Id || 'unknown';
  
  if (!rawFilePath) {
    console.warn(`[${operationId}] Missing file path in event`);
    return res.status(400).end('Missing file path');
  }

  // URL decode the file path to handle encoded characters (+ to space, % encoding)
  const filePath = decodeURIComponent(rawFilePath.replace(/\+/g, ' '));
  console.log(`[${operationId}] Processing file: ${filePath} (event: ${eventId})`, {
    rawPath: rawFilePath,
    decodedPath: filePath
  });

  try {
    // Apply file filters
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    
    // Skip if already encrypted
    if (['.gpg', '.pgp', '.asc'].includes(fileExtension)) {
      console.log(`[${operationId}] Skipping already encrypted file: ${fileName}`);
      return res.status(200).json({
        status: 'skipped',
        reason: 'already_encrypted',
        sourcePath: filePath,
        operationId
      });
    }

    // Apply glob filters
    const includeMatch = minimatch(filePath, config.pgpEncryptHandler.includeGlob);
    const excludeMatch = minimatch(filePath, config.pgpEncryptHandler.excludeGlob);
    
    if (!includeMatch || excludeMatch) {
      console.log(`[${operationId}] File filtered out - include: ${includeMatch}, exclude: ${excludeMatch}`);
      return res.status(200).json({
        status: 'skipped',
        reason: 'filtered',
        sourcePath: filePath,
        operationId
      });
    }

    // Connect to SFTP
    const sftp = new SFTPClient(config.sftp);
    await sftp.connect();
    console.log(`[${operationId}] SFTP connected`);

    // Check if target file already exists
    const targetFileName = fileName + config.pgpEncryptHandler.extension;
    let targetDir;
    if (config.pgpEncryptHandler.upload.relative) {
      targetDir = path.join(path.dirname(filePath), config.pgpEncryptHandler.upload.path);
    } else {
      targetDir = config.pgpEncryptHandler.upload.path;
    }
    const targetPath = path.join(targetDir, targetFileName);

    // Check if file exists and handle overwrite
    if (!config.pgpEncryptHandler.overwrite) {
      try {
        const stats = await sftp.stat(targetPath);
        console.log(`[${operationId}] Target file already exists, skipping: ${targetPath}`, {
          size: stats.size,
          isFile: stats.isFile,
          isDirectory: stats.isDirectory
        });
        await sftp.end();
        return res.status(200).json({
          status: 'skipped',
          reason: 'file_exists',
          sourcePath: filePath,
          targetPath: targetPath,
          operationId
        });
      } catch (err) {
        console.log(`[${operationId}] Target file does not exist, proceeding: ${targetPath}`, {
          error: err.message
        });
        // File doesn't exist, continue
      }
    }

    console.log(`[${operationId}] Downloading source file: ${filePath}`);
    const sourceStream = await sftp.downloadStream(filePath);

    const chunks = [];
    sourceStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    sourceStream.on('end', async () => {
      console.log(`[${operationId}] Source stream ended, processing ${chunks.length} chunks`);
      const buffer = Buffer.concat(chunks);
      console.log(`[${operationId}] Source file size: ${buffer.length} bytes`);

      try {
        const replayStream = Readable.from(buffer);
        
        // Encrypt the stream
        const encryptedStream = await encryptPGPStream(
          replayStream,
          config.pgpEncryptHandler.publicKeys,
          {
            signPrivateKey: config.pgpEncryptHandler.signPrivateKey,
            signPassphrase: config.pgpEncryptHandler.signPassphrase,
            asciiArmor: config.pgpEncryptHandler.asciiArmor
          }
        );
        console.log(`[${operationId}] Encryption complete`);

        // Ensure the target directory exists
        await sftp.mkdir(targetDir, true);
        console.log(`[${operationId}] Uploading encrypted file to: ${targetPath}`);

        await sftp.uploadStream(encryptedStream, targetPath);
        console.log(`[${operationId}] Upload complete`);

        // Optionally delete the original file
        if (config.pgpEncryptHandler.deleteAfterUpload) {
          console.log(`[${operationId}] Deleting source file: ${filePath}`);
          await sftp.deleteFile(filePath);
          console.log(`[${operationId}] Source file deleted`);
        }

        await sftp.end();
        
        const elapsedTime = Date.now() - startTime;
        console.log(`[${operationId}] Operation completed in ${elapsedTime}ms`);

        res.status(200).json({
          status: 'success',
          sourcePath: filePath,
          targetPath: targetPath,
          size: buffer.length,
          operationId,
          elapsedTime
        });
      } catch (innerErr) {
        console.error(`[${operationId}] Encryption or upload failed:`, innerErr);
        await sftp.end();
        res.status(500).json({
          status: 'error',
          error: 'Encryption or upload failed',
          operationId
        });
      }
    });

    sourceStream.on('error', (err) => {
      console.error(`[${operationId}] Source stream error:`, err.message);
      sftp.end();
      res.status(500).json({
        status: 'error',
        error: 'Stream error',
        operationId
      });
    });

  } catch (err) {
    console.error(`[${operationId}] Error handling webhook:`, err);
    res.status(500).json({
      status: 'error',
      error: 'Internal Server Error',
      operationId
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: false
  }
};
