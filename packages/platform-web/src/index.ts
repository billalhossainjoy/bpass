import {
  EMPTY_VAULT,
  createVaultStore,
  syncAccountToSheet,
  type KeyValueStore,
  type Vault,
  type VaultStorageAdapter,
  type VaultStore,
} from "@bpass/core"

const VAULT_KEY = "bpass_vault"
const VAULT_CHANGE_EVENT = "bpass:vault-change"

function readVault(): Vault {
  if (typeof window === "undefined") return { ...EMPTY_VAULT }
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    if (!raw) return { ...EMPTY_VAULT }
    return JSON.parse(raw) as Vault
  } catch {
    return { ...EMPTY_VAULT }
  }
}

export function createWebVaultStorage(): VaultStorageAdapter {
  return {
    load: async () => readVault(),
    save: async (vault) => {
      localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
      window.dispatchEvent(new CustomEvent(VAULT_CHANGE_EVENT, { detail: vault }))
    },
    subscribe(listener) {
      const onStorage = (e: StorageEvent) => {
        if (e.key === VAULT_KEY && e.newValue) {
          listener(JSON.parse(e.newValue) as Vault)
        }
      }
      const onCustom = (e: Event) => {
        listener((e as CustomEvent<Vault>).detail)
      }
      window.addEventListener("storage", onStorage)
      window.addEventListener(VAULT_CHANGE_EVENT, onCustom)
      return () => {
        window.removeEventListener("storage", onStorage)
        window.removeEventListener(VAULT_CHANGE_EVENT, onCustom)
      }
    },
  }
}

export function createWebKeyValueStore(): KeyValueStore {
  return {
    async get(keys) {
      const out: Record<string, unknown> = {}
      for (const key of keys) {
        const raw = localStorage.getItem(key)
        if (raw === null) continue
        try {
          out[key] = JSON.parse(raw)
        } catch {
          out[key] = raw
        }
      }
      return out
    },
    async set(values) {
      for (const [key, value] of Object.entries(values)) {
        localStorage.setItem(
          key,
          typeof value === "string" ? value : JSON.stringify(value),
        )
      }
    },
  }
}

export function createWebVaultStore(): VaultStore {
  const kv = createWebKeyValueStore()
  return createVaultStore(createWebVaultStorage(), {
    onAccountAdded: (account) => syncAccountToSheet(kv, account),
  })
}

export function createWebPlatform() {
  const keyValueStore = createWebKeyValueStore()
  return {
    id: "web" as const,
    vaultStore: createWebVaultStore(),
    keyValueStore,
    canCaptureTab: false,
    backupHint:
      "Use Google Sheet backup in Settings to save and restore your accounts.",
    sheetScriptPath: "packages/core/scripts/google-sheet-webhook.gs",
    layoutClassName:
      "h-dvh w-full max-w-md mx-auto shadow-sm sm:border-x sm:border-border sm:bg-background",
  }
}

export function createMobilePlatform() {
  return {
    ...createWebPlatform(),
    id: "mobile" as const,
    layoutClassName: "h-full min-h-0 w-full",
    backupHint:
      "Use Google Sheet backup in Settings to save and restore your accounts.",
  }
}

export const webPlatform = createWebPlatform()
