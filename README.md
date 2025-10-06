# S2G Webhook Handlers

A Vercel-ready collection of webhook handlers for automating wor...on, or custom automation triggered by SFTP To Go webhook events.

---

## Deployment

1. **Clone the repository:**
    ```bash
    git clone <this-repo>
    cd <this-repo>
    ```

2. **Install dependencies:**
    ```bash
...
    ```

3. **Set environment variables:**
    - Required base variables:
        ```bash
        WEBHOOK_SECRET=...
        SFTP_HOST=...
        SFTP_PORT=22
        SFTP_USER=...
        SFTP_PASSWORD=...
        ```
    - PGP Decryption variables:
        ```bash
        PGP_PRIVATE_KEY=...
        PGP_PRIVATE_KEY_PASSPHRASE=...
        DECRYPT_UPLOAD_PATH=decrypted
        DECRYPT_UPLOAD_PATH_IS_RELATIVE=true
        DECRYPT_DELETE_AFTER_UPLOAD=false
        ```
    - PGP Encryption variables:
        ```bash
        PGP_PUBLIC_KEYS=...   # one or more armored public keys
        PGP_SIGN_PRIVATE_KEY= # optional
        PGP_SIGN_PASSPHRASE=  # optional
        ENCRYPT_UPLOAD_PATH=encrypted
        ENCRYPT_UPLOAD_PATH_IS_RELATIVE=true
        ENCRYPT_EXTENSION=.gpg
        ENCRYPT_ASCII_ARMOR=false
        ENCRYPT_INCLUDE_GLOB=**/*
        ENCRYPT_EXCLUDE_GLOB=**/*.{gpg,pgp,asc}
        ENCRYPT_OVERWRITE=false
        ENCRYPT_DELETE_AFTER_UPLOAD=false
        ```

4. **Deploy to Vercel (recommended):**
    ```bash
    vercel
    vercel --prod
    ```
    After deploy, Vercel will print your live endpoints.

---

## Webhooks

- Configure SFTP To Go webhooks to point at your Vercel endpoint  
  (e.g. `https://your-project.vercel.app/api/webhook-pgp-decrypt` or `/api/webhook-pgp-encrypt`).
- In SFTP To Go, go to **Settings → Webhooks**, add a webhook, and paste your endpoint.
- Select the event(s) you want (e.g. file uploaded) and add filters.

---

## Project Structure

- Shared utilities live in `lib/`:
  - `config.js` for env parsing with handler-specific configuration groups
  - `sftp.js` for SFTP I/O
  - `pgp.js` for PGP helpers
  - `webhook-utils.js` for signature verification and common helpers
- Handlers are located in `/api/` and follow a similar request pattern, so you can add more for different automations.

---

## Configuration Structure

The configuration is organized into handler-specific groups to avoid naming conflicts and provide clear separation:

```javascript
{
  sftp: { ... },           // Shared SFTP configuration
  pgpDecryptHandler: {     // PGP decryption specific config
    webhookSecret: ...,      // Shared webhook verification
    privateKey: ...,
    passphrase: ...,
    upload: { path: ..., relative: ... },
    deleteAfterUpload: ...
  },
  pgpEncryptHandler: {     // PGP encryption specific config
    webhookSecret: ...,      // Shared webhook verification
    publicKeys: ...,
    signPrivateKey: ...,   // optional
    signPassphrase: ...,   // optional
    upload: { path: ..., relative: ... },
    extension: '.gpg',
    asciiArmor: false,
    includeGlob: '**/*',
    excludeGlob: '**/*.{gpg,pgp,asc}',
    overwrite: false,
    deleteAfterUpload: false
  }
}
```

---

## Example: PGP Decryption Handler

The `/api/webhook-pgp-decrypt.js` endpoint:
- Verifies the webhook signature
- Downloads the encrypted SFTP file
- Decrypts it using your PGP private key and passphrase
- Uploads the decrypted file to the configured directory (relative or absolute)
- Optionally deletes the original file

Check the handler’s code and comments for more details.

---

## Example: PGP Encryption Handler

The `/api/webhook-pgp-encrypt.js` endpoint:
- Verifies the webhook signature
- Applies file filtering using glob patterns (include/exclude)
- Skips files that are already encrypted (.gpg, .pgp, .asc extensions)
- Streams the source SFTP file through the PGP encryptor (minimal memory usage)
- Encrypts to one or more recipient public keys (optional signing supported)
- Uploads the encrypted file to the configured directory (relative or absolute)
- Optionally deletes the original file
- Returns detailed JSON response with operation status and metadata

### Key Features:
- **Streaming encryption**: Processes files without loading them entirely into memory
- **File filtering**: Uses glob patterns to include/exclude specific files
- **Idempotency**: Skips already encrypted files and existing targets (unless overwrite enabled)
- **Multiple recipients**: Supports encrypting to multiple public keys
- **Optional signing**: Can sign encrypted files with a private key
- **Flexible output**: Supports both binary (.gpg) and ASCII armored (.asc) formats
- **Comprehensive logging**: Structured logs with operation IDs for tracking

### Configuration Options:
- `ENCRYPT_INCLUDE_GLOB`: Files to process (default: `**/*`)
- `ENCRYPT_EXCLUDE_GLOB`: Files to skip (default: `**/*.{gpg,pgp,asc}`)
- `ENCRYPT_EXTENSION`: Output file extension (default: `.gpg`)
- `ENCRYPT_ASCII_ARMOR`: Output format (default: `false` for binary)
- `ENCRYPT_OVERWRITE`: Overwrite existing files (default: `false`)

Check the handler's code and comments for more details.

---

## Extending This Project

- Add new handlers in `/api/` for different automation tasks (e.g. PGP encryption, compression, custom notifications).
- Place reusable functions in `lib/`.
- Each handler can have its own environment variables and logic.

---

## Support

For issues, open a GitHub issue or contact your technical team.
