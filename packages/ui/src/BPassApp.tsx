import { useMemo, useState } from "react"
import { Plus, Search, Loader2 } from "lucide-react"
import type { Account } from "@bpass/core"
import { useNow, useVault } from "./hooks/useVault"
import { usePlatform } from "./platform"
import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"
import { Toaster } from "./components/ui/sonner"
import { CodeRow } from "./components/CodeRow"
import { AddAccountDialog } from "./components/AddAccountDialog"
import { EditAccountDialog } from "./components/EditAccountDialog"
import { DeleteAccountDialog } from "./components/DeleteAccountDialog"
import { SettingsButton, SettingsDialog } from "./components/SettingsDialog"
import { Logo } from "./components/Logo"
import { cn } from "./lib/utils"

export function BPassApp() {
  const { layoutClassName } = usePlatform()
  const { vault, loading, addAccount, updateAccount, deleteAccount, replaceAllAccounts } =
    useVault()
  const now = useNow()

  const [query, setQuery] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)

  const accounts = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...vault.accounts].sort((a, b) =>
      (a.issuer || a.label).localeCompare(b.issuer || b.label),
    )
    if (!q) return list
    return list.filter(
      (a) =>
        a.issuer.toLowerCase().includes(q) ||
        a.label.toLowerCase().includes(q),
    )
  }, [vault.accounts, query])

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col bg-background text-foreground",
        layoutClassName ?? "min-h-dvh w-full",
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b bg-background px-3 py-2.5">
        <Logo size={28} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-none">BPass</span>
          <span className="text-[10px] leading-tight text-muted-foreground">
            Authenticator
          </span>
        </div>
        <div className="ml-auto">
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        </div>
      </header>

      <div className="shrink-0 border-b bg-background px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search platforms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <main className="scrollbar-hide flex min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex min-h-full w-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState hasAccounts={vault.accounts.length > 0} />
        ) : (
          <div className="w-full min-w-0 space-y-2.5 pb-1">
            {accounts.map((account) => (
              <CodeRow
                key={account.id}
                account={account}
                now={now}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t bg-background p-3">
        <Button className="w-full" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" /> Add account
        </Button>
      </footer>

      <AddAccountDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={addAccount}
      />
      <EditAccountDialog
        account={editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSave={updateAccount}
      />
      <DeleteAccountDialog
        account={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={deleteAccount}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        vault={vault}
        onReplaceAllAccounts={replaceAllAccounts}
      />
      <Toaster position="top-center" richColors />
    </div>
  )
}

function EmptyState({ hasAccounts }: { hasAccounts: boolean }) {
  return (
    <div className="flex min-h-full w-full min-w-0 flex-col items-center justify-center gap-3 px-4 py-6 text-center">
      <Logo size={56} className="shrink-0 opacity-90" />
      <p className="text-sm font-medium">
        {hasAccounts ? "No matches" : "No accounts yet"}
      </p>
      <p className="text-xs text-muted-foreground">
        {hasAccounts
          ? "Try a different search term."
          : "Add an account to get started."}
      </p>
    </div>
  )
}
