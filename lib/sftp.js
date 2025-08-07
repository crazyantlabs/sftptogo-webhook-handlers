// lib/sftp.js

const Client = require('ssh2-sftp-client');
const { Readable } = require('stream');

class SFTPClient {
  constructor({ host, port, username, password }) {
    this.config = { host, port, username, password };
    this.client = new Client();
  }

  async connect() {
    console.log('[sftp] Connecting with config:', {
      ...this.config,
      password: this.config.password ? '***' : undefined,
    });
    try {
      await this.client.connect(this.config);
      console.log('[sftp] Connected');
    } catch (err) {
      console.error('[sftp] Connection failed:', err.message);
      throw err;
    }
  }

  async end() {
    await this.client.end();
  }

  async downloadStream(remotePath) {
    const buffer = await this.client.get(remotePath);
    return Readable.from(buffer);
  }

  async uploadStream(stream, remotePath) {
    return this.client.put(stream, remotePath, { encoding: null });
  }

  async deleteFile(remotePath) {
    return this.client.delete(remotePath);
  }

  async list(remotePath) {
    return this.client.list(remotePath);
  }

  async mkdir(remotePath, recursive = true) {
    return this.client.mkdir(remotePath, recursive);
  }
}

module.exports = { SFTPClient };
