import { useEffect, useState } from "react"
import { Copy, Check, RefreshCw, Settings, CloudUpload } from "lucide-react"
import { toast } from "sonner"
import type { Account, Vault } from "@bpass/core"
import {
  DEFAULT_BACKUP_SHEET_TAB,
  DEFAULT_REGULAR_SHEET_TAB,
  backupAllAccountsToSheet,
  generateWebhookToken,
  getSheetWebhookSettings,
  isValidSheetWebhookToken,
  isValidSheetWebhookUrl,
  postAccountToSheet,
  pullAccountsFromSheet,
  setSheetWebhookSettings,
} from "@bpass/core"
import { usePlatform } from "../platform"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Separator } from "./ui/separator"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vault: Vault
  onReplaceAllAccounts: (
    inputs: Omit<Account, "id" | "createdAt">[],
  ) => Promise<void>
}

function SettingsDialogBody({
  vault,
  onReplaceAllAccounts,
}: {
  vault: Vault
  onReplaceAllAccounts: SettingsDialogProps["onReplaceAllAccounts"]
}) {
  const { keyValueStore, backupHint, sheetScriptPath, id: platformId } =
    usePlatform()
  const [sheetUrl, setSheetUrl] = useState("")
  const [sheetToken, setSheetToken] = useState("")
  const [regularSheetTab, setRegularSheetTab] = useState(DEFAULT_REGULAR_SHEET_TAB)
  const [backupSheetTab, setBackupSheetTab] = useState(DEFAULT_BACKUP_SHEET_TAB)
  const [sheetTokenCopied, setSheetTokenCopied] = useState(false)
  const [sheetEnabled, setSheetEnabled] = useState(false)
  const [sheetLoaded, setSheetLoaded] = useState(false)
  const [sheetSaving, setSheetSaving] = useState(false)
  const [sheetTesting, setSheetTesting] = useState(false)
  const [sheetBackingUp, setSheetBackingUp] = useState(false)
  const [sheetPulling, setSheetPulling] = useState(false)

  const regularTabLabel = regularSheetTab.trim() || DEFAULT_REGULAR_SHEET_TAB
  const backupTabLabel = backupSheetTab.trim() || DEFAULT_BACKUP_SHEET_TAB

  useEffect(() => {
    let cancelled = false
    void getSheetWebhookSettings(keyValueStore).then(
      ({ url, enabled, token, regularSheetTab: regular, backupSheetTab: backup }) => {
        if (cancelled) return
        setSheetUrl(url)
        setSheetToken(token)
        setRegularSheetTab(regular || DEFAULT_REGULAR_SHEET_TAB)
        setBackupSheetTab(backup || DEFAULT_BACKUP_SHEET_TAB)
        setSheetEnabled(enabled)
        setSheetLoaded(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [keyValueStore])

  const copySheetToken = async () => {
    if (!sheetToken.trim()) {
      toast.error("Generate or enter a webhook secret first.")
      return
    }
    try {
      await navigator.clipboard.writeText(sheetToken.trim())
      setSheetTokenCopied(true)
      toast.success("Webhook secret copied")
      setTimeout(() => setSheetTokenCopied(false), 1200)
    } catch {
      toast.error("Could not copy to clipboard.")
    }
  }

  const handleGenerateSheetToken = () => {
    const token = generateWebhookToken()
    setSheetToken(token)
    void navigator.clipboard.writeText(token).then(
      () => {
        setSheetTokenCopied(true)
        toast.success("Secret generated and copied")
        setTimeout(() => setSheetTokenCopied(false), 1200)
      },
      () => toast.success("Secret generated — use Copy to paste it"),
    )
  }

  const saveSheetSettings = async () => {
    if (sheetEnabled && !isValidSheetWebhookUrl(sheetUrl)) {
      toast.error("Enter a valid Apps Script web app URL ending in /exec")
      return
    }
    if (sheetEnabled && !isValidSheetWebhookToken(sheetToken)) {
      toast.error("Enter a webhook secret with at least 16 characters.")
      return
    }
    setSheetSaving(true)
    try {
      await setSheetWebhookSettings(
        keyValueStore,
        sheetUrl,
        sheetEnabled,
        sheetToken,
        regularSheetTab,
        backupSheetTab,
      )
      toast.success("Google Sheet settings saved")
    } catch {
      toast.error("Could not save sheet settings.")
    } finally {
      setSheetSaving(false)
    }
  }

  const ensureSheetCredentials = (): boolean => {
    if (!isValidSheetWebhookUrl(sheetUrl)) {
      toast.error("Enter a valid Apps Script /exec URL first.")
      return false
    }
    if (!isValidSheetWebhookToken(sheetToken)) {
      toast.error("Enter a webhook secret with at least 16 characters.")
      return false
    }
    return true
  }

  const handleBackupToSheet = async () => {
    if (!ensureSheetCredentials()) return
    if (vault.accounts.length === 0) {
      toast.error("No accounts to back up.")
      return
    }

    const tab = backupTabLabel
    const confirmed = window.confirm(
      `This clears all data on the "${tab}" sheet tab and replaces it with your ${vault.accounts.length} BPass account(s). The regular sheet tab is not changed.`,
    )
    if (!confirmed) return

    setSheetBackingUp(true)
    try {
      await setSheetWebhookSettings(
        keyValueStore,
        sheetUrl,
        sheetEnabled,
        sheetToken,
        regularSheetTab,
        backupSheetTab,
      )
      const written = await backupAllAccountsToSheet(
        sheetUrl.trim(),
        sheetToken.trim(),
        vault.accounts,
        tab,
      )
      toast.success(`Backed up ${written} account(s) to "${tab}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sheet backup failed.")
    } finally {
      setSheetBackingUp(false)
    }
  }

  const handleRestoreFromBackupSheet = async () => {
    if (!ensureSheetCredentials()) return

    const tab = backupTabLabel
    setSheetPulling(true)
    try {
      await setSheetWebhookSettings(
        keyValueStore,
        sheetUrl,
        sheetEnabled,
        sheetToken,
        regularSheetTab,
        backupSheetTab,
      )
      const accounts = await pullAccountsFromSheet(
        sheetUrl.trim(),
        sheetToken.trim(),
        tab,
      )

      const confirmed = window.confirm(
        `This replaces all ${vault.accounts.length} account(s) in BPass with ${accounts.length} account(s) from the "${tab}" backup tab. Continue?`,
      )
      if (!confirmed) return

      await onReplaceAllAccounts(accounts)
      toast.success(`Restored ${accounts.length} account(s) from "${tab}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore from backup failed.")
    } finally {
      setSheetPulling(false)
    }
  }

  const testSheetWebhook = async () => {
    if (!isValidSheetWebhookUrl(sheetUrl)) {
      toast.error("Save a valid Apps Script /exec URL first.")
      return
    }
    if (!isValidSheetWebhookToken(sheetToken)) {
      toast.error("Save a webhook secret with at least 16 characters first.")
      return
    }
    setSheetTesting(true)
    try {
      await postAccountToSheet(
        sheetUrl.trim(),
        sheetToken.trim(),
        {
          id: "test",
          issuer: "BPass Test",
          label: "webhook-test",
          secret: "JBSWY3DPEHPK3PXP",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          createdAt: Date.now(),
        },
        regularTabLabel,
      )
      toast.success(`Test row sent to "${regularTabLabel}" tab`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed.")
    } finally {
      setSheetTesting(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Google Sheet sync and backup.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Stored accounts</p>
          <p className="text-lg font-semibold tabular-nums">
            {vault.accounts.length}
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-medium">
            {platformId === "extension"
              ? "Removing the extension deletes in-browser data."
              : "Your data stays in this browser only."}
          </p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-300/90">
            {backupHint}
          </p>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Google Sheet sync</h3>
          <p className="text-xs text-muted-foreground">
            When you <strong>add</strong> an account, BPass appends a row to the{" "}
            <strong>regular</strong> sheet tab. Deleting in BPass does not remove
            rows from the sheet. Backup and restore use the <strong>backup</strong>{" "}
            tab. Script:{" "}
            <code className="text-[10px]">{sheetScriptPath}</code>.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sheetEnabled}
              onChange={(e) => setSheetEnabled(e.target.checked)}
              className="size-4 rounded border border-input"
            />
            Enable Google Sheet sync
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="sheet-webhook-url" className="text-xs">
              Web app URL
            </Label>
            <Input
              id="sheet-webhook-url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="font-mono text-[10px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sheet-webhook-token" className="text-xs">
              Webhook secret
            </Label>
            <div className="flex gap-2">
              <Input
                id="sheet-webhook-token"
                type="password"
                placeholder="Same as BPASS_SECRET in Apps Script"
                value={sheetToken}
                onChange={(e) => setSheetToken(e.target.value)}
                className="font-mono text-[10px]"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                onClick={() => void copySheetToken()}
                disabled={!sheetToken.trim()}
                aria-label="Copy webhook secret"
              >
                {sheetTokenCopied ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleGenerateSheetToken}
              >
                Generate
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="regular-sheet-tab" className="text-xs">
              Regular sheet tab (live sync)
            </Label>
            <Input
              id="regular-sheet-tab"
              placeholder={DEFAULT_REGULAR_SHEET_TAB}
              value={regularSheetTab}
              onChange={(e) => setRegularSheetTab(e.target.value)}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              New accounts are appended here when sync is enabled.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="backup-sheet-tab" className="text-xs">
              Backup sheet tab
            </Label>
            <Input
              id="backup-sheet-tab"
              placeholder={DEFAULT_BACKUP_SHEET_TAB}
              value={backupSheetTab}
              onChange={(e) => setBackupSheetTab(e.target.value)}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Full backup and restore use this tab only. Create both tabs in your
              spreadsheet (e.g. &quot;Regular&quot; and &quot;Backup&quot;).
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={saveSheetSettings}
              disabled={sheetSaving || !sheetLoaded}
            >
              Save sheet settings
            </Button>
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={testSheetWebhook}
              disabled={
                sheetTesting ||
                !sheetUrl.trim() ||
                !isValidSheetWebhookToken(sheetToken)
              }
            >
              Send test row
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-xs font-medium">Sheet backup</h4>
            <p className="text-[10px] text-muted-foreground">
              Push all accounts to <strong>{backupTabLabel}</strong>, or restore
              the full vault from that tab.
            </p>
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => void handleBackupToSheet()}
              disabled={sheetBackingUp || vault.accounts.length === 0}
            >
              <CloudUpload className="mr-2 size-4" />
              {sheetBackingUp ? "Backing up…" : "Backup all accounts to sheet"}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => void handleRestoreFromBackupSheet()}
              disabled={sheetPulling}
            >
              <RefreshCw className="mr-2 size-4" />
              {sheetPulling ? "Restoring…" : "Restore all from backup sheet"}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            The /exec URL alone is not enough — callers must send your webhook
            secret. If the URL leaks, rotate the secret and redeploy the script.
            Secrets are still stored in plain text in your Sheet.
          </p>
        </div>
      </div>
    </>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  vault,
  onReplaceAllAccounts,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scrollbar-hide max-h-[90vh] max-w-[360px] overflow-y-auto">
        {open ? (
          <SettingsDialogBody
            key="settings-body"
            vault={vault}
            onReplaceAllAccounts={onReplaceAllAccounts}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 shrink-0"
      onClick={onClick}
      aria-label="Settings"
    >
      <Settings className="size-4" />
    </Button>
  )
}
