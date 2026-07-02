# BPass

Personal MFA authenticator — TOTP codes only (no passwords). Like 1Password, but scoped to two-factor authentication for your own use.

**Chrome extension** and **Ionic Capacitor mobile app**, sharing one UI and vault logic.

## Features

- Add accounts via QR scan, screenshot upload, or manual secret entry
- Live TOTP codes with countdown
- Search and manage accounts (edit label, delete)
- **Settings → Import / Export** — JSON backup or CSV with secrets
- Chrome extension: capture QR from the active tab; auto JSON backup on vault changes
- Mobile: native iOS/Android shell via Capacitor

## Structure

```
.
├── apps/
│   ├── extension/     # Chrome extension (Vite + CRXJS)
│   └── mobile/        # Ionic Capacitor app (Vite + React)
├── packages/
│   ├── core/          # TOTP, vault, import/export
│   ├── ui/            # Shared BPassApp UI
│   ├── platform-web/  # localStorage (web + mobile)
│   └── platform-extension/  # chrome.storage + tab capture
```

## Getting started

```bash
pnpm install
```

### Chrome extension

```bash
pnpm dev:extension
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `apps/extension/dist` (after `pnpm build:extension`) or use the dev server per [CRXJS docs](https://crxjs.dev/vite-plugin/getting-started/react/dev-and-build)

```bash
pnpm build:extension
```

### Mobile (Ionic Capacitor)

```bash
pnpm dev:mobile          # browser preview at http://localhost:5174
pnpm build:mobile
pnpm cap:sync            # copy web build + sync native projects
pnpm android:doctor      # verify Java, Android SDK, adb, and emulators
pnpm android:bundle      # build release Android App Bundle (.aab)
pnpm android:run         # build, sync, install, and run on Android
```

First-time native setup (requires Xcode / Android Studio):

```bash
cd apps/mobile
pnpm exec cap add ios
pnpm exec cap add android
pnpm exec cap open ios    # or android
```

On Linux, Android Studio may install Java without adding it to your shell `PATH`.
Use the `pnpm android:*` commands from the repo root; they automatically use
Android Studio's bundled JBR and the Android SDK tools.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Typecheck all workspaces |
| `pnpm dev:extension` | Extension dev server |
| `pnpm dev:mobile` | Mobile web dev server |
| `pnpm build:extension` | Production extension → `apps/extension/dist` |
| `pnpm build:mobile` | Production web bundle → `apps/mobile/dist` |
| `pnpm cap:sync` | Capacitor sync after mobile build |
| `pnpm android:doctor` | Check Java, Android SDK, adb, and emulator setup |
| `pnpm android:build` | Build and sync the mobile app, then assemble Android debug APK |
| `pnpm android:bundle` | Build and sync the mobile app, then assemble Android release AAB |
| `pnpm android:run` | Build, sync, install, and run the Android app |
| `pnpm android:open` | Open the Android project in Android Studio |

## GitHub releases

`.github/workflows/release-build.yml` runs on every push and manual dispatch.
It builds:

- `bpass-android-*.aab` from the Capacitor Android app
- `bpass-extension-*.zip` from `apps/extension/dist`

The workflow uploads both as run artifacts and creates a GitHub Release tagged
like `build-main-12.1-abcdef0`.

Android signing is optional. For a signed release AAB, add these repository
secrets in GitHub:

- `ANDROID_KEYSTORE_BASE64` — base64 encoded keystore file
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Create the base64 value with:

```bash
base64 -w 0 release.keystore
```

## Import / export

In **Settings**:

- **Import backup (CSV / JSON)** — restores MFA secrets; duplicates are skipped
- **Export JSON backup** — full vault file (`bpass-backup.json`)
- **Export CSV** — issuer, label, secret, algorithm, digits, period

Use the same backup file across extension and mobile to move your codes.

## Security note

Secrets are stored locally (browser `localStorage` / `chrome.storage.sync` / device WebView). Export files contain plaintext secrets — store them safely.
# bpass
