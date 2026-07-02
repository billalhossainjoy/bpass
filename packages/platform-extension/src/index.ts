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

async function loadVaultFromChrome(): Promise<Vault> {
  const syncData = await chrome.storage.sync.get(VAULT_KEY)
  if (syncData[VAULT_KEY]) {
    return syncData[VAULT_KEY] as Vault
  }

  const localData = await chrome.storage.local.get(VAULT_KEY)
  const localVault = localData[VAULT_KEY] as Vault | undefined
  if (localVault) {
    await chrome.storage.sync.set({ [VAULT_KEY]: localVault })
    await chrome.storage.local.remove(VAULT_KEY)
    return localVault
  }

  return { ...EMPTY_VAULT }
}

export function createExtensionVaultStorage(): VaultStorageAdapter {
  return {
    load: loadVaultFromChrome,
    save: async (vault) => {
      await chrome.storage.sync.set({ [VAULT_KEY]: vault })
      if (chrome.runtime.lastError) {
        throw new Error(
          chrome.runtime.lastError.message ||
            "Could not save to Chrome Sync storage.",
        )
      }
    },
    subscribe(listener) {
      const onChanged = (
        changes: Record<string, chrome.storage.StorageChange>,
        area: string,
      ) => {
        if (area !== "sync" || !changes[VAULT_KEY]?.newValue) return
        listener(changes[VAULT_KEY].newValue as Vault)
      }
      chrome.storage.onChanged.addListener(onChanged)
      return () => chrome.storage.onChanged.removeListener(onChanged)
    },
  }
}

export function createExtensionKeyValueStore(): KeyValueStore {
  return {
    async get(keys) {
      const data = await chrome.storage.sync.get(keys)
      return data as Record<string, unknown>
    },
    async set(values) {
      await chrome.storage.sync.set(values)
    },
  }
}

export function createExtensionVaultStore(): VaultStore {
  const kv = createExtensionKeyValueStore()
  return createVaultStore(createExtensionVaultStorage(), {
    onAccountAdded: (account) => syncAccountToSheet(kv, account),
  })
}

/** Capture the currently visible browser tab as a PNG data URL. */
export function captureVisibleTab(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        reject(
          new Error(
            chrome.runtime.lastError?.message ||
              "Could not capture the current tab.",
          ),
        )
        return
      }
      resolve(dataUrl)
    })
  })
}

export function createExtensionPlatform() {
  const keyValueStore = createExtensionKeyValueStore()
  return {
    id: "extension" as const,
    vaultStore: createExtensionVaultStore(),
    keyValueStore,
    canCaptureTab: true,
    captureVisibleTab,
    backupHint:
      "Use Google Sheet backup in Settings to save and restore your accounts.",
    sheetScriptPath: "packages/core/scripts/google-sheet-webhook.gs",
    layoutClassName: "h-full w-full min-h-0",
  }
}

export const extensionPlatform = createExtensionPlatform()

export { VAULT_KEY }
