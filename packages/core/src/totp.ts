import { TOTP, Secret, URI } from "otpauth"
import type { Account, OtpAlgorithm } from "./types"

export interface ParsedOtp {
  issuer: string
  label: string
  secret: string
  algorithm: OtpAlgorithm
  digits: number
  period: number
}

function toTotp(account: {
  issuer: string
  label: string
  secret: string
  algorithm: OtpAlgorithm
  digits: number
  period: number
}): TOTP {
  return new TOTP({
    issuer: account.issuer,
    label: account.label,
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period,
    secret: Secret.fromBase32(normalizeSecret(account.secret)),
  })
}

/** Strip spaces and uppercase; otpauth expects clean base32. */
export function normalizeSecret(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase()
}

/** Returns the current code for the account, padded to its digit count. */
export function generateCode(account: Account, timestamp = Date.now()): string {
  try {
    return toTotp(account).generate({ timestamp })
  } catch {
    return "·".repeat(account.digits || 6)
  }
}

/** Seconds remaining until the current code rotates. */
export function secondsRemaining(period: number, timestamp = Date.now()): number {
  const epochSeconds = Math.floor(timestamp / 1000)
  return period - (epochSeconds % period)
}

/** Validate that a string is a usable base32 TOTP secret. */
export function isValidSecret(secret: string): boolean {
  const cleaned = normalizeSecret(secret)
  if (cleaned.length < 8) return false
  try {
    Secret.fromBase32(cleaned)
    return true
  } catch {
    return false
  }
}

/** Parse an otpauth:// URI (e.g. decoded from a QR code) into account fields. */
export function parseOtpAuthUri(uri: string): ParsedOtp {
  const totp = URI.parse(uri.trim())
  if (!(totp instanceof TOTP)) {
    throw new Error("Only time-based (TOTP) codes are supported.")
  }
  return {
    issuer: totp.issuer || "",
    label: totp.label || "",
    secret: totp.secret.base32,
    algorithm: totp.algorithm as OtpAlgorithm,
    digits: totp.digits,
    period: totp.period,
  }
}
