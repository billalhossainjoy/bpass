import type { Vault } from "./types"

export interface VaultStorageAdapter {
  load(): Promise<Vault>
  save(vault: Vault): Promise<void>
  subscribe(listener: (vault: Vault) => void): () => void
}

export interface KeyValueStore {
  get(keys: string[]): Promise<Record<string, unknown>>
  set(values: Record<string, unknown>): Promise<void>
}
