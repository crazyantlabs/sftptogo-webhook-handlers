const dotenv = require('dotenv');
dotenv.config();

function parseBool(value) {
  return value === 'true' || value === true;
}

module.exports = {
  sftp: {
    host: process.env.SFTP_HOST,
    port: parseInt(process.env.SFTP_PORT || '22', 10),
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASSWORD,
  },

  pgpDecryptHandler: {
    webhookSecret: process.env.DECRYPT_WEBHOOK_SECRET,
    privateKey: process.env.PGP_PRIVATE_KEY,
    passphrase: process.env.PGP_PRIVATE_KEY_PASSPHRASE,
    upload: {
      path: process.env.DECRYPT_UPLOAD_PATH,
      relative: parseBool(process.env.DECRYPT_UPLOAD_PATH_IS_RELATIVE),
    },
    deleteAfterUpload: parseBool(process.env.DECRYPT_DELETE_AFTER_UPLOAD),
  },
  pgpEncryptHandler: {
    webhookSecret: process.env.ENCRYPT_WEBHOOK_SECRET,
    publicKeys: process.env.PGP_PUBLIC_KEYS,
    signPrivateKey: process.env.PGP_SIGN_PRIVATE_KEY,
    signPassphrase: process.env.PGP_SIGN_PASSPHRASE,
    upload: {
      path: process.env.ENCRYPT_UPLOAD_PATH,
      relative: parseBool(process.env.ENCRYPT_UPLOAD_PATH_IS_RELATIVE),
    },
    extension: process.env.ENCRYPT_EXTENSION || '.gpg',
    asciiArmor: parseBool(process.env.ENCRYPT_ASCII_ARMOR),
    includeGlob: process.env.ENCRYPT_INCLUDE_GLOB || '**/*',
    excludeGlob: process.env.ENCRYPT_EXCLUDE_GLOB || '**/*.{gpg,pgp,asc}',
    overwrite: parseBool(process.env.ENCRYPT_OVERWRITE),
    deleteAfterUpload: parseBool(process.env.ENCRYPT_DELETE_AFTER_UPLOAD),
  },
};