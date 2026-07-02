import { defineManifest } from "@crxjs/vite-plugin"

export default defineManifest({
  manifest_version: 3,
  name: "BPass Authenticator",
  version: "1.0.0",
  description:
    "Personal MFA authenticator — manage TOTP codes with Google Sheet backup.",
  action: {
    default_popup: "index.html",
    default_title: "BPass",
  },
  permissions: ["storage", "tabs"],
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  icons: {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  },
})
