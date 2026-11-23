# Sahil Study Portal

A responsive, private study library with username/password login, PDF/video/document uploads, subject labels, search, downloads and deletion.

## Important deployment notes

- This is a deployable application source package, **not a live hosted website**. A public link is available only after deploying it to a hosting provider.
- The app does not require Gmail or a phone number. The owner signs in with a configured username and password.
- Never commit `.env`, share the password, or place credentials in frontend code. Configure credentials privately in the hosting provider's environment-variable settings.
- Uploaded files and sessions are stored under `data/`. The host must provide a persistent disk/volume mounted at the app's `data` directory. Without a persistent volume, uploaded files may be lost on redeploy/restart.
- Free hosting tiers commonly sleep, impose storage/bandwidth limits, or do not provide persistent disks. Unlimited free storage is not realistic.
- Use HTTPS in production. Back up the `data/` directory regularly.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Set `LOGIN_USERNAME`, a new private `LOGIN_PASSWORD`, and a long random `SESSION_SECRET` in `.env`.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

## Deploy

Deploy this folder to a Node.js host that supports persistent storage. Set the environment variables from `.env.example` in the host dashboard and mount a persistent disk at `data/`. Set the start command to `npm start`.

## Supported uploads

PDF, MP4, WebM, MOV/QuickTime, JPEG, PNG, WebP, TXT and DOCX. Default maximum upload size is 500 MB; configure `MAX_FILE_SIZE_MB` to suit the host's limits.
