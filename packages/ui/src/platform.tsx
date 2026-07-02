import { createContext, useContext, type ReactNode } from "react"
import type { KeyValueStore, VaultStore } from "@bpass/core"

export interface BPassPlatform {
  id: "web" | "extension" | "mobile"
  vaultStore: VaultStore
  keyValueStore: KeyValueStore
  canCaptureTab: boolean
  captureVisibleTab?: () => Promise<string>
  backupHint: string
  sheetScriptPath: string
  layoutClassName?: string
}

const PlatformContext = createContext<BPassPlatform | null>(null)

export function PlatformProvider({
  platform,
  children,
}: {
  platform: BPassPlatform
  children: ReactNode
}) {
  return (
    <PlatformContext.Provider value={platform}>
      {children}
    </PlatformContext.Provider>
  )
}

export function usePlatform(): BPassPlatform {
  const ctx = useContext(PlatformContext)
  if (!ctx) {
    throw new Error("usePlatform must be used within PlatformProvider")
  }
  return ctx
}
