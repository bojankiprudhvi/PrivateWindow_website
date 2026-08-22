# Private Window website

This folder contains the public download site for Private Window. It is a
static website by design: it can be previewed locally and later deployed to
Firebase Hosting without a framework migration.

## Local development

The site is a React 19 app built with Vite. Install Node.js 20.19 or later,
then run the following from this folder:

```powershell
npm install
npm run dev
```

Use `npm run build` before deployment; it produces a static `dist/` folder
that Firebase Hosting can serve directly.

## Planned structure

```text
website/
├── index.html                 Landing page and download call to action
├── package.json               React and Vite scripts
├── styles/
│   └── site.css               Responsive visual system
├── scripts/
│   └── site.js                Download/version data and small interactions
├── assets/
│   ├── screenshots/           Product screenshots exported from UI_Draft/
│   ├── icons/                 Website icons and favicon
│   └── brand/                 Logo and social-sharing artwork
├── downloads/                 Release ZIP files for local previews only
├── legal/
│   ├── privacy.html           Privacy policy
│   └── terms.html             Terms, licence, and acceptable use
├── RELEASES.md                Published versions, checksums, and release notes
└── README.md                  This document
```

Release archives are intentionally excluded from Git. The release deployment
script stages the installer in `public/downloads/`, which Vite copies into
`dist/downloads/` for Firebase Hosting. Firebase serves the installer as a
download; Firebase Storage is not required.

## Homepage outline

1. **Hero** — Private Window for Windows, a concise privacy-focused promise,
   Windows requirement, and the primary **Download for Windows** button.
2. **How it works** — three short steps: open Private Window, embed an app,
   and enable capture protection.
3. **Protection in action** — paired screenshots showing protected and
   unprotected screen-share views.
4. **Feature highlights** — protected app hosting, offline-first live
   transcription, and region capture.
5. **Privacy and compatibility** — clear explanation of Windows capture API
   support, Windows 10 version 2004+ requirement, and what remains local.
6. **Download and install** — version, architecture, file size, SHA-256,
   installation instructions, and a link to release notes.
7. **FAQ and footer** — known limitations, support contact, privacy policy,
   terms, and credits for Qt and whisper.cpp.

## Copy and safety principles

- Do not promise invisibility from every product or capture method. Say
  **"hidden from supported Windows screen capture"** and link to a
  compatibility explanation.
- State that the application is for a user's own privacy and legitimate work.
- Be explicit that local transcription remains on-device by default, while
  the optional service mode sends audio to the endpoint selected by the user.
- The first download should be a ZIP until an installer and code-signing
  process are in place. The page must mention Windows SmartScreen warnings may
  appear for an unsigned application.

## Future release workflow

1. In the Firebase console, create a project and enable **Hosting**.
2. Run the following from this folder, replacing the argument with the Firebase
   project ID:

   ```powershell
   .\deploy-firebase.bat your-firebase-project-id
   ```

   The script builds the NSIS installer, copies it to `public/downloads/`,
   builds the existing Vite site, and deploys it to Firebase Hosting. The first
   deployment opens a Google sign-in prompt for the account that owns the
   Firebase project.
3. Download and test the published installer from the live site before
   announcing the release.

Before public release, the project also needs a licence decision, a support
contact address, a privacy policy, and preferably Windows code signing.

## Zero-fixed-cost licensing backend

Firebase serves only the static site. Supabase free tier provides email-link sign-in,
PostgreSQL, and one Edge Function for trials and licensing. Paid keys are issued
manually after offline payment; a payment gateway can automate the same issuance
endpoint later without changing keys or device rules.

1. Create a Supabase project, keep the Email provider enabled, and run
   `supabase/migrations/202608210001_licensing.sql` in the SQL editor.
2. Copy `.env.example` to `.env.local` and enter the Supabase project URL, anon
   key, Edge Function URL, and the email customers should contact.
3. Configure Edge Function secrets: `PUBLIC_SITE_ORIGIN`,
   `LICENSE_ENCRYPTION_KEY` (base64-encoded 32 random bytes),
   `ENTITLEMENT_SIGNING_KEY`, `LICENSE_ADMIN_KEY`, and
   `FREE_KEYS_ENABLED=true` while the launch promotion is active.
4. Deploy with `supabase functions deploy licensing --no-verify-jwt`.
5. After a customer signs in and pays offline, issue their key:

   ```powershell
   $env:LICENSE_ADMIN_KEY = 'your-secret'
   .\scripts\issue-license.ps1 -ApiUrl 'https://PROJECT.supabase.co/functions/v1/licensing' -Email 'customer@example.com' -Plan pro
   ```

The command returns the key immediately and it also appears inside that user's
authenticated website account. Supported plans are `single`, `pro`, and `power`.
Use `free` only for a manually assigned promotional key.

Never put service-role, encryption, signing, or administrator secrets in a
`VITE_` variable. Vite variables are public browser configuration.
