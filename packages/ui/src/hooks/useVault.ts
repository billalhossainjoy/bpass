import { useCallback, useEffect, useState } from "react"
import type { Account, Vault } from "@bpass/core"
import { EMPTY_VAULT } from "@bpass/core"
import { usePlatform } from "../platform"

export interface VaultState {
  vault: Vault
  loading: boolean
  addAccount: (input: Omit<Account, "id" | "createdAt">) => Promise<void>
  updateAccount: (
    id: string,
    patch: Partial<Pick<Account, "issuer" | "label">>,
  ) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  replaceAllAccounts: (
    inputs: Omit<Account, "id" | "createdAt">[],
  ) => Promise<void>
}

export function useVault(): VaultState {
  const { vaultStore } = usePlatform()
  const [vault, setVault] = useState<Vault>(EMPTY_VAULT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void vaultStore.loadVault().then((data) => {
      if (!cancelled) setVault(data)
      if (!cancelled) setLoading(false)
    })

    const unsub = vaultStore.subscribe(setVault)

    return () => {
      cancelled = true
      unsub()
    }
  }, [vaultStore])

  const addAccount = useCallback(
    async (input: Omit<Account, "id" | "createdAt">) => {
      const next = await vaultStore.addAccount(input)
      setVault(next)
    },
    [vaultStore],
  )

  const updateAccount = useCallback(
    async (id: string, patch: Partial<Pick<Account, "issuer" | "label">>) => {
      const next = await vaultStore.updateAccount(id, patch)
      setVault(next)
    },
    [vaultStore],
  )

  const deleteAccount = useCallback(
    async (id: string) => {
      const next = await vaultStore.deleteAccount(id)
      setVault(next)
    },
    [vaultStore],
  )

  const replaceAllAccounts = useCallback(
    async (inputs: Omit<Account, "id" | "createdAt">[]) => {
      const next = await vaultStore.replaceAllAccounts(inputs)
      setVault(next)
    },
    [vaultStore],
  )

  return {
    vault,
    loading,
    addAccount,
    updateAccount,
    deleteAccount,
    replaceAllAccounts,
  }
}

/** Shared 1s clock so all rows tick together. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
