import type { Account, Vault } from "./types"

export const BACKUP_FILENAME = "bpass-backup.json"

export function vaultToJson(vault: Vault): string {
  return JSON.stringify(vault, null, 2)
}

export function downloadVaultJson(vault: Vault): void {
  const blob = new Blob([vaultToJson(vault)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = BACKUP_FILENAME
  anchor.click()
  URL.revokeObjectURL(url)
}

function isAccount(value: unknown): value is Account {
  if (!value || typeof value !== "object") return false
  const a = value as Account
  return (
    typeof a.secret === "string" &&
    typeof a.issuer === "string" &&
    typeof a.algorithm === "string" &&
    typeof a.digits === "number" &&
    typeof a.period === "number"
  )
}

/** Parse a BPass JSON backup into account inputs. */
export function parseAccountsFromJson(text: string): Omit<Account, "id" | "createdAt">[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("Invalid JSON backup file.")
  }

  let accounts: unknown[]
  if (Array.isArray(data)) {
    accounts = data
  } else if (data && typeof data === "object" && Array.isArray((data as Vault).accounts)) {
    accounts = (data as Vault).accounts
  } else {
    throw new Error("Backup file must contain a vault or accounts array.")
  }

  if (accounts.length === 0) {
    throw new Error("No accounts found in backup file.")
  }

  const parsed: Omit<Account, "id" | "createdAt">[] = []
  for (let i = 0; i < accounts.length; i++) {
    const row = accounts[i]
    if (!isAccount(row)) {
      throw new Error(`Invalid account at index ${i + 1}.`)
    }
    parsed.push({
      issuer: row.issuer || "Unknown",
      label: row.label ?? "",
      secret: row.secret,
      algorithm: row.algorithm,
      digits: row.digits,
      period: row.period,
    })
  }
  return parsed
}

export async function readJsonFile(file: File): Promise<string> {
  const text = await file.text()
  if (!text.trim()) throw new Error("The backup file is empty.")
  return text
}
