import { useState } from "react"
import { toast } from "sonner"
import type { Account } from "@bpass/core"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

interface EditAccountDialogProps {
  account: Account | null
  onOpenChange: (open: boolean) => void
  onSave: (
    id: string,
    patch: Partial<Pick<Account, "issuer" | "label">>,
  ) => Promise<void>
}

function EditAccountForm({
  account,
  onOpenChange,
  onSave,
}: {
  account: Account
  onOpenChange: (open: boolean) => void
  onSave: EditAccountDialogProps["onSave"]
}) {
  const [issuer, setIssuer] = useState(account.issuer)
  const [label, setLabel] = useState(account.label)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await onSave(account.id, {
        issuer: issuer.trim() || "Unknown",
        label: label.trim(),
      })
      toast.success("Account updated")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogContent className="max-w-[340px]">
      <DialogHeader>
        <DialogTitle>Edit account</DialogTitle>
        <DialogDescription>
          Rename the platform or the account label.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-issuer">Platform name</Label>
          <Input
            id="edit-issuer"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-label">Account</Label>
          <Input
            id="edit-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={busy} className="w-full">
          Save changes
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export function EditAccountDialog({
  account,
  onOpenChange,
  onSave,
}: EditAccountDialogProps) {
  return (
    <Dialog open={!!account} onOpenChange={onOpenChange}>
      {account && (
        <EditAccountForm
          key={account.id}
          account={account}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />
      )}
    </Dialog>
  )
}
