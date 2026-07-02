import { EMPTY_VAULT, type Account, type Vault } from "./types"
import { normalizeSecret } from "./totp"
import type { VaultStorageAdapter } from "./storage"

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export interface VaultStoreOptions {
  onAccountAdded?: (account: Account) => void
  onAccountDeleted?: (account: Account) => void | Promise<void>
  beforeImportSave?: () => Promise<void>
}

export interface ImportResult {
  vault: Vault
  added: number
  alreadyStored: number
  duplicateInCsv: number
}

export interface VaultStore {
  loadVault(): Promise<Vault>
  subscribe(listener: (vault: Vault) => void): () => void
  addAccount(input: Omit<Account, "id" | "createdAt">): Promise<Vault>
  updateAccount(
    id: string,
    patch: Partial<Pick<Account, "issuer" | "label">>,
  ): Promise<Vault>
  deleteAccount(id: string): Promise<Vault>
  importAccounts(
    inputs: Omit<Account, "id" | "createdAt">[],
  ): Promise<ImportResult>
  replaceAllAccounts(
    inputs: Omit<Account, "id" | "createdAt">[],
  ): Promise<Vault>
}

export function createVaultStore(
  adapter: VaultStorageAdapter,
  options: VaultStoreOptions = {},
): VaultStore {
  async function mutate(
    mutator: (accounts: Account[]) => Account[],
  ): Promise<Vault> {
    const current = await adapter.load()
    const next: Vault = {
      version: current.version,
      accounts: mutator(current.accounts),
      updatedAt: Date.now(),
    }
    await adapter.save(next)
    return next
  }

  return {
    loadVault: () => adapter.load(),
    subscribe: (listener) => adapter.subscribe(listener),

    async addAccount(input) {
      const account: Account = {
        ...input,
        secret: normalizeSecret(input.secret),
        id: uid(),
        createdAt: Date.now(),
      }
      const vault = await mutate((accounts) => [...accounts, account])
      options.onAccountAdded?.(account)
      return vault
    },

    updateAccount(id, patch) {
      return mutate((accounts) =>
        accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      )
    },

    async deleteAccount(id) {
      const current = await adapter.load()
      const removed = current.accounts.find((a) => a.id === id)
      if (!removed) {
        return mutate((accounts) => accounts.filter((a) => a.id !== id))
      }

      if (options.onAccountDeleted) {
        await options.onAccountDeleted(removed)
      }

      return mutate((accounts) => accounts.filter((a) => a.id !== id))
    },

    async replaceAllAccounts(inputs) {
      const current = await adapter.load()
      const accounts: Account[] = inputs.map((input) => ({
        ...input,
        secret: normalizeSecret(input.secret),
        id: uid(),
        createdAt: Date.now(),
      }))
      const next: Vault = {
        version: current.version,
        accounts,
        updatedAt: Date.now(),
      }
      await adapter.save(next)
      return next
    },

    async importAccounts(inputs) {
      const current = await adapter.load()
      const storedSecrets = new Set(
        current.accounts.map((a) => normalizeSecret(a.secret)),
      )

      const newAccounts: Account[] = []
      const csvSeen = new Set<string>()
      let alreadyStored = 0
      let duplicateInCsv = 0

      for (const input of inputs) {
        const secret = normalizeSecret(input.secret)

        if (storedSecrets.has(secret)) {
          alreadyStored++
          continue
        }

        if (csvSeen.has(secret)) {
          duplicateInCsv++
          continue
        }

        csvSeen.add(secret)
        storedSecrets.add(secret)
        newAccounts.push({
          ...input,
          secret,
          id: uid(),
          createdAt: Date.now(),
        })
      }

      if (newAccounts.length === 0) {
        return {
          vault: current,
          added: 0,
          alreadyStored,
          duplicateInCsv,
        }
      }

      const next: Vault = {
        version: current.version,
        accounts: [...current.accounts, ...newAccounts],
        updatedAt: Date.now(),
      }
      await options.beforeImportSave?.()
      await adapter.save(next)
      return {
        vault: next,
        added: newAccounts.length,
        alreadyStored,
        duplicateInCsv,
      }
    },
  }
}

export { EMPTY_VAULT }
