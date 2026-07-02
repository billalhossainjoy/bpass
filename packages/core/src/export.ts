import type { Account } from "./types"

const CSV_HEADERS = [
  "issuer",
  "label",
  "secret",
  "algorithm",
  "digits",
  "period",
  "created_at",
] as const

function escapeCsvField(value: string | number): string {
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function accountToRow(account: Account): string {
  return [
    account.issuer,
    account.label,
    account.secret,
    account.algorithm,
    account.digits,
    account.period,
    new Date(account.createdAt).toISOString(),
  ]
    .map(escapeCsvField)
    .join(",")
}

/** Build a CSV string from all accounts (includes secrets). */
export function accountsToCsv(accounts: Account[]): string {
  const rows = accounts.map(accountToRow)
  return [CSV_HEADERS.join(","), ...rows].join("\n")
}

/** Trigger a CSV file download in the browser. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportAccountsCsv(accounts: Account[]): void {
  const date = new Date().toISOString().slice(0, 10)
  downloadCsv(accountsToCsv(accounts), `bpass-export-${date}.csv`)
}
