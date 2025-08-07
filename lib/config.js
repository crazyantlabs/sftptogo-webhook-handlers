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
  webhookSecret: process.env.WEBHOOK_SECRET,
  pgpPrivateKey: process.env.PGP_PRIVATE_KEY,
  pgpPassphrase: process.env.PGP_PRIVATE_KEY_PASSPHRASE,
  upload: {
    path: process.env.UPLOAD_PATH,
    relative: parseBool(process.env.UPLOAD_PATH_IS_RELATIVE),
  },
  deleteAfterUpload: parseBool(process.env.DELETE_AFTER_UPLOAD),
};