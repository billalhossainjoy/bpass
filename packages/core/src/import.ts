import type { Account, OtpAlgorithm } from "./types"
import { isValidSecret, normalizeSecret } from "./totp"

export type ImportAccountInput = Omit<Account, "id" | "createdAt">

const REQUIRED_COLUMNS = ["issuer", "secret"] as const

const ALGORITHMS: OtpAlgorithm[] = ["SHA1", "SHA256", "SHA512"]

/** Parse a CSV string into rows (handles quoted fields). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\r" && next === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      i++
    } else if (char === "\n" || char === "\r") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

function parseAlgorithm(value: string | undefined): OtpAlgorithm {
  const upper = (value ?? "SHA1").trim().toUpperCase()
  if (ALGORITHMS.includes(upper as OtpAlgorithm)) {
    return upper as OtpAlgorithm
  }
  throw new Error(`Invalid algorithm "${value}". Use SHA1, SHA256, or SHA512.`)
}

function parseDigits(value: string | undefined): number {
  const digits = Number(value ?? 6)
  if (![6, 7, 8].includes(digits)) {
    throw new Error(`Invalid digits "${value}". Use 6, 7, or 8.`)
  }
  return digits
}

function parsePeriod(value: string | undefined): number {
  const period = Number(value ?? 30)
  if (![30, 60].includes(period)) {
    throw new Error(`Invalid period "${value}". Use 30 or 60.`)
  }
  return period
}

function rowToAccount(
  headers: string[],
  values: string[],
  lineNumber: number,
): ImportAccountInput {
  const record: Record<string, string> = {}
  headers.forEach((header, index) => {
    record[header.trim().toLowerCase()] = (values[index] ?? "").trim()
  })

  for (const col of REQUIRED_COLUMNS) {
    if (!record[col]) {
      throw new Error(`Row ${lineNumber}: missing required column "${col}".`)
    }
  }

  const secret = normalizeSecret(record.secret)
  if (!isValidSecret(secret)) {
    throw new Error(`Row ${lineNumber}: invalid secret key.`)
  }

  return {
    issuer: record.issuer || "Unknown",
    label: record.label ?? "",
    secret,
    algorithm: parseAlgorithm(record.algorithm),
    digits: parseDigits(record.digits),
    period: parsePeriod(record.period),
  }
}

/** Parse exported BPass CSV into account inputs. */
export function parseAccountsFromCsv(text: string): ImportAccountInput[] {
  const rows = parseCsv(text.trim())
  if (rows.length === 0) {
    throw new Error("The CSV file is empty.")
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase())
  if (!headers.includes("secret")) {
    throw new Error('CSV must include a "secret" column.')
  }

  const accounts: ImportAccountInput[] = []
  for (let i = 1; i < rows.length; i++) {
    accounts.push(rowToAccount(headers, rows[i], i + 1))
  }

  if (accounts.length === 0) {
    throw new Error("No account rows found in the CSV file.")
  }

  return accounts
}

export async function readCsvFile(file: File): Promise<string> {
  const text = await file.text()
  if (!text.trim()) {
    throw new Error("The CSV file is empty.")
  }
  return text
}
