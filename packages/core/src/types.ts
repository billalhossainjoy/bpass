export type OtpAlgorithm = "SHA1" | "SHA256" | "SHA512"

export interface Account {
  id: string
  issuer: string
  label: string
  secret: string
  algorithm: OtpAlgorithm
  digits: number
  period: number
  createdAt: number
}

export interface Vault {
  version: number
  accounts: Account[]
  updatedAt: number
}

export const EMPTY_VAULT: Vault = {
  version: 1,
  accounts: [],
  updatedAt: 0,
}
