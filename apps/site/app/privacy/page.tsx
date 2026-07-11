const sections = [
  {
    title: "Data stored by the app",
    body: [
      "BPass stores authenticator account data on your device so it can generate TOTP codes. This includes issuer or platform name, account label, TOTP secret, algorithm, number of digits, and period.",
      "On Android, BPass disables system backup and device-transfer extraction for app data so authenticator secrets are not copied by Android backup services.",
    ],
  },
  {
    title: "Data collection and sharing",
    body: [
      "BPass does not collect analytics, advertising identifiers, location, contacts, messages, photos, audio, call logs, calendar data, health data, payment data, or device identifiers.",
      "BPass does not sell user data and does not use user data for advertising or tracking.",
    ],
  },
  {
    title: "Optional Google Sheet sync",
    body: [
      "Google Sheet sync is off unless you configure a Google Apps Script web app URL and enable sync in Settings.",
      "When enabled, BPass sends the account data you add or back up to the URL you provide. TOTP secrets are encrypted locally with your Settings webhook secret before they are sent. Other fields, such as issuer names, account labels, algorithm, digits, period, and created timestamp, are not encrypted by BPass before sync.",
      "The destination is controlled by you. BPass validates that the sync URL uses the Google Apps Script HTTPS /exec endpoint, so synced data is encrypted in transit.",
      "The Settings webhook secret is unique to each user unless they choose to reuse it. BPass does not know or recover this secret.",
    ],
  },
  {
    title: "Google Play Data Safety mapping",
    body: [
      "Data collection: BPass does not collect data to a developer-operated server. Optional Google Sheet sync transmits user-provided authenticator data to the Google Apps Script URL configured by the user for app functionality and backup.",
      "Data sharing: BPass does not sell data, share data with advertisers, or send data to analytics providers. Optional sync sends data to the user-controlled Google Sheet endpoint.",
      "Security practices: Optional Sheet sync uses HTTPS in transit, and TOTP secrets are encrypted before they are written to the Sheet. Local vault data and exported files should still be protected by the user.",
      "Account deletion: BPass does not create a BPass account. Users can delete individual accounts in the app, clear app storage, uninstall the app, and delete any synced rows directly from their Google Sheet.",
    ],
  },
  {
    title: "Imports, exports, and QR images",
    body: [
      "BPass can import and export JSON or CSV backup files only when you request it. Export files include TOTP secrets in plain text so you can restore your accounts.",
      "When you upload a QR image, BPass processes it locally in the app to read an otpauth:// code. BPass does not upload QR images to a server.",
    ],
  },
  {
    title: "Security, retention, and deletion",
    body: [
      "BPass stores local vault data in app storage. You can delete individual accounts inside the app, clear app storage from Android settings, or uninstall the app.",
      "If you enabled Google Sheet sync, deleting data in BPass does not automatically delete rows from your Google Sheet. You control deletion of data stored in your Google Sheet.",
      "Keep exported backup files and Google Sheets private. Sheet TOTP secrets are encrypted, but exported JSON and CSV files can contain plain text TOTP secrets.",
      "If you rotate your Settings webhook secret, make a fresh Sheet backup. Existing encrypted Sheet rows require the original secret to restore.",
    ],
  },
  {
    title: "Children and sensitive data",
    body: [
      "BPass is not directed to children. The app is intended for users managing their own authentication codes.",
      "Do not store passwords, government IDs, payment card numbers, health information, or other unrelated sensitive data in account labels or issuer names.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy questions, contact the developer at contact@billalhossain.dev.",
      "This policy should be hosted at a public URL and kept consistent with the Google Play Data Safety form.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="content-page">
      <section className="page-hero">
        <p className="eyebrow">Google Play policy disclosure</p>
        <h1>Privacy Policy</h1>
        <p>
          Last updated: July 10, 2026. This page describes what BPass stores,
          what it does not collect, and how optional Google Sheet sync works.
        </p>
      </section>

      <section className="article-stack">
        {sections.map((section) => (
          <article key={section.title} className="policy-section">
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </section>

      <article id="data-deletion" className="policy-section">
        <h2>Data deletion</h2>
        <p>To remove your data from BPass, follow these steps:</p>
        <ol>
          <li>Open BPass and delete individual accounts from inside the app.</li>
          <li>Clear app storage via Android Settings → Apps → BPass → Storage → Clear storage.</li>
          <li>Uninstall the app from your device to remove remaining local data.</li>
        </ol>
        <p>
          If you enabled Google Sheet sync, please delete any synced rows directly
          from your Google Sheet — BPass does not remove rows from user-controlled
          Sheets when you delete entries in the app.
        </p>
        <p>
          If you need assistance or want to request developer action (note: the
          developer does not hold user authenticator data), email
          <a href="mailto:contact@billalhossain.dev">contact@billalhossain.dev</a>.
        </p>
      </article>

      <section className="notice">
        <h2>Suggested Play Console Data Safety summary</h2>
        <p>
          If Google Sheet sync is available in the app, disclose optional user
          data transfer for app functionality. If sync remains disabled, account
          data stays on the device except for user-requested imports and exports.
        </p>
      </section>
    </main>
  )
}
