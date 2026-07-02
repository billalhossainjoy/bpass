import type { Account } from "./types"
import type { KeyValueStore } from "./storage"
import { parseAccountsFromJson } from "./backup"
import type { ImportAccountInput } from "./import"
import { normalizeSecret } from "./totp"

const URL_KEY = "bpass_sheet_webhook_url"
const ENABLED_KEY = "bpass_sheet_webhook_enabled"
const TOKEN_KEY = "bpass_sheet_webhook_token"
const REGULAR_TAB_KEY = "bpass_sheet_regular_tab"
const BACKUP_TAB_KEY = "bpass_sheet_backup_tab"
/** @deprecated migrated to backup tab */
const LEGACY_TAB_KEY = "bpass_sheet_tab_name"

export const DEFAULT_REGULAR_SHEET_TAB = "Regular"
export const DEFAULT_BACKUP_SHEET_TAB = "Backup"
export const MIN_WEBHOOK_TOKEN_LENGTH = 16

export type SheetWebhookAction = "add" | "delete" | "backup" | "pull"

export interface SheetWebhookSettings {
  url: string
  enabled: boolean
  token: string
  regularSheetTab: string
  backupSheetTab: string
}

export function generateWebhookToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export function isValidSheetWebhookUrl(url: string): boolean {
  const trimmed = url.trim()
  return (
    trimmed.startsWith("https://script.google.com/macros/s/") &&
    trimmed.endsWith("/exec")
  )
}

export function isValidSheetWebhookToken(token: string): boolean {
  return token.trim().length >= MIN_WEBHOOK_TOKEN_LENGTH
}

export async function getSheetWebhookSettings(
  store: KeyValueStore,
): Promise<SheetWebhookSettings> {
  const data = await store.get([
    URL_KEY,
    ENABLED_KEY,
    TOKEN_KEY,
    REGULAR_TAB_KEY,
    BACKUP_TAB_KEY,
    LEGACY_TAB_KEY,
  ])

  const legacyTab = (data[LEGACY_TAB_KEY] as string | undefined) ?? ""
  const regularSheetTab =
    (data[REGULAR_TAB_KEY] as string | undefined)?.trim() ||
    DEFAULT_REGULAR_SHEET_TAB
  const backupSheetTab =
    (data[BACKUP_TAB_KEY] as string | undefined)?.trim() ||
    legacyTab.trim() ||
    DEFAULT_BACKUP_SHEET_TAB

  return {
    url: (data[URL_KEY] as string | undefined) ?? "",
    enabled: Boolean(data[ENABLED_KEY]),
    token: (data[TOKEN_KEY] as string | undefined) ?? "",
    regularSheetTab,
    backupSheetTab,
  }
}

export async function setSheetWebhookSettings(
  store: KeyValueStore,
  url: string,
  enabled: boolean,
  token: string,
  regularSheetTab: string,
  backupSheetTab: string,
): Promise<void> {
  await store.set({
    [URL_KEY]: url.trim(),
    [ENABLED_KEY]: enabled,
    [TOKEN_KEY]: token.trim(),
    [REGULAR_TAB_KEY]: regularSheetTab.trim() || DEFAULT_REGULAR_SHEET_TAB,
    [BACKUP_TAB_KEY]: backupSheetTab.trim() || DEFAULT_BACKUP_SHEET_TAB,
  })
}

interface SheetWebhookResponse {
  ok?: boolean
  error?: string
  removed?: number
  written?: number
  accounts?: unknown[]
}

function assertSheetCredentials(url: string, token: string): void {
  if (!isValidSheetWebhookUrl(url)) {
    throw new Error("Enter a valid Apps Script web app URL ending in /exec")
  }
  if (!isValidSheetWebhookToken(token)) {
    throw new Error("Enter a webhook secret with at least 16 characters.")
  }
}

function buildFormBody(
  action: SheetWebhookAction,
  token: string,
  account: Account,
  sheetTab?: string,
): URLSearchParams {
  const params = new URLSearchParams()
  params.set("action", action)
  params.set("token", token.trim())
  params.set("secret", normalizeSecret(account.secret))
  if (sheetTab?.trim()) params.set("sheetTab", sheetTab.trim())

  if (action === "add") {
    params.set("issuer", account.issuer)
    params.set("label", account.label)
    params.set("algorithm", account.algorithm)
    params.set("digits", String(account.digits))
    params.set("period", String(account.period))
    params.set("createdAt", new Date(account.createdAt).toISOString())
  }

  return params
}

async function parseSheetResponse(res: Response): Promise<SheetWebhookResponse> {
  const body = await res.text().catch(() => "")
  let data: SheetWebhookResponse | null = null
  try {
    data = body ? (JSON.parse(body) as SheetWebhookResponse) : null
  } catch {
    data = null
  }

  if (!res.ok || data?.ok === false) {
    const detail = data?.error || body.slice(0, 200) || res.statusText
    throw new Error(`Sheet webhook failed (${res.status}): ${detail}`)
  }

  return data ?? { ok: true }
}

async function sendSheetForm(
  webhookUrl: string,
  token: string,
  params: URLSearchParams,
): Promise<SheetWebhookResponse> {
  assertSheetCredentials(webhookUrl, token)
  params.set("token", token.trim())

  const res = await fetch(webhookUrl.trim(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    redirect: "follow",
  })

  return parseSheetResponse(res)
}

async function sendSheetWebhook(
  webhookUrl: string,
  token: string,
  action: SheetWebhookAction,
  account: Account,
  sheetTab?: string,
): Promise<SheetWebhookResponse> {
  return sendSheetForm(
    webhookUrl,
    token,
    buildFormBody(action, token, account, sheetTab),
  )
}

function accountToSheetRow(account: Account) {
  return {
    issuer: account.issuer,
    label: account.label,
    secret: normalizeSecret(account.secret),
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period,
    createdAt: new Date(account.createdAt).toISOString(),
  }
}

/** Parse account rows returned from Google Sheet pull. */
export function parseAccountsFromSheetRows(rows: unknown[]): ImportAccountInput[] {
  return parseAccountsFromJson(JSON.stringify(rows))
}

/** POST a new account row to the regular sheet tab. */
export async function postAccountToSheet(
  webhookUrl: string,
  token: string,
  account: Account,
  regularSheetTab?: string,
): Promise<void> {
  await sendSheetWebhook(webhookUrl, token, "add", account, regularSheetTab)
}

/** POST a delete request on the regular sheet tab. */
export async function deleteAccountFromSheet(
  webhookUrl: string,
  token: string,
  account: Account,
  regularSheetTab?: string,
): Promise<number> {
  const result = await sendSheetWebhook(
    webhookUrl,
    token,
    "delete",
    account,
    regularSheetTab,
  )
  return result.removed ?? 0
}

/** Clear the backup sheet tab and write all accounts. */
export async function backupAllAccountsToSheet(
  webhookUrl: string,
  token: string,
  accounts: Account[],
  backupSheetTab?: string,
): Promise<number> {
  const params = new URLSearchParams()
  params.set("action", "backup")
  params.set("sheetTab", backupSheetTab?.trim() || DEFAULT_BACKUP_SHEET_TAB)
  params.set("accounts", JSON.stringify(accounts.map(accountToSheetRow)))

  const result = await sendSheetForm(webhookUrl, token, params)
  return result.written ?? accounts.length
}

/** Pull all accounts from the backup sheet tab. */
export async function pullAccountsFromSheet(
  webhookUrl: string,
  token: string,
  backupSheetTab?: string,
): Promise<ImportAccountInput[]> {
  const params = new URLSearchParams()
  params.set("action", "pull")
  params.set("sheetTab", backupSheetTab?.trim() || DEFAULT_BACKUP_SHEET_TAB)

  const result = await sendSheetForm(webhookUrl, token, params)
  if (!result.accounts || !Array.isArray(result.accounts)) {
    throw new Error("Backup sheet did not return any accounts.")
  }
  if (result.accounts.length === 0) {
    throw new Error("No accounts found in the backup sheet.")
  }
  return parseAccountsFromSheetRows(result.accounts)
}

async function syncSheetIfEnabled(
  store: KeyValueStore,
  account: Account,
): Promise<void> {
  const { url, enabled, token, regularSheetTab } =
    await getSheetWebhookSettings(store)
  if (!enabled || !url.trim() || !isValidSheetWebhookToken(token)) return

  const trimmedUrl = url.trim()
  const tab = regularSheetTab.trim() || DEFAULT_REGULAR_SHEET_TAB
  await postAccountToSheet(trimmedUrl, token, account, tab)
}

/** Fire-and-forget: add row on the regular sheet when sync is enabled. */
export function syncAccountToSheet(
  store: KeyValueStore,
  account: Account,
): void {
  void syncSheetIfEnabled(store, account).catch((err) => {
    console.warn("[BPass] Google Sheet add sync failed.", err)
  })
}
