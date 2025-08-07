# S2G Webhook Handlers

A Vercel-ready collection of webhook handlers for automating workflows with [SFTP To Go](https://sftptogo.com). Use this project as a starting point for file integration, decryption, compression, or custom automation triggered by SFTP To Go webhook events.

---

## Deployment

1. **Clone the repository:**
    ```bash
    git clone <this-repo>
    cd <this-repo>
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Set up environment variables:**
    - Copy `.env-template` to `.env` and fill in your credentials and configuration.
    - Core variables (required for all handlers):
        ```
        SFTP_HOST=...
        SFTP_PORT=...
        SFTP_USER=...
        SFTP_PASSWORD=...
        SFTPTOGO_WEBHOOK_SIGNING_SECRET=...
        ```
    - Handler-specific variables (example for PGP decryption):
        ```
        PGP_PRIVATE_KEY=...
        PGP_PASSPHRASE=...
        UPLOAD_PATH=decrypted
        UPLOAD_RELATIVE=true
        DELETE_AFTER_UPLOAD=false
        ```

4. **Deploy to Vercel:**
    ```bash
    vercel --prod
    ```
    After deploy, Vercel will print your live endpoint URL.

---

## Setting Up SFTP To Go Webhooks

1. **Get your Vercel endpoint**  
   (e.g. `https://your-project.vercel.app/api/webhook-pgp-decrypt`)

2. **Create a webhook in SFTP To Go:**
    - Go to the SFTP To Go console → Automations → Webhooks.
    - Add a new webhook and paste your endpoint.
    - Select the event(s) you want (e.g. `file created`).
    - Copy the signing secret provided by SFTP To Go.

3. **Update your environment variables:**
    - Add the signing secret as `SFTPTOGO_WEBHOOK_SIGNING_SECRET`.
    - Update any handler-specific variables as needed.
    - Redeploy on Vercel if you change environment variables.

---

## How It Works

- On webhook trigger, the relevant handler verifies the request signature, connects to SFTP To Go, processes the file (decrypt, compress, etc.), and uploads the result per your config.
- Common utilities for signature verification and request parsing are in `lib/webhook-utils.js`.
- Handlers are located in `/api/` and follow a consistent pattern, so you can add more for different automations.

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

## Extending This Project

- Add new handlers in `/api/` for different automation tasks (e.g. PGP encryption, compression, custom notifications).
- Place reusable functions in `lib/`.
- Each handler can have its own environment variables and logic.

---

## Support

For issues, open a GitHub issue or contact your technical team.
