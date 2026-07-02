import { useState } from "react"
import { toast } from "sonner"
import type { Account } from "@bpass/core"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"

interface DeleteAccountDialogProps {
  account: Account | null
  onOpenChange: (open: boolean) => void
  onConfirm: (id: string) => Promise<void>
}

export function DeleteAccountDialog({
  account,
  onOpenChange,
  onConfirm,
}: DeleteAccountDialogProps) {
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    if (!account) return
    setBusy(true)
    try {
      await onConfirm(account.id)
      toast.success("Account deleted")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!account} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(340px,calc(100vw-2rem))] gap-3">
        <DialogHeader>
          <DialogTitle>Delete account?</DialogTitle>
          <DialogDescription>
            This removes{" "}
            <span className="font-medium text-foreground">
              {account?.issuer || account?.label || "this account"}
            </span>{" "}
            and its secret from this device. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => void confirm()}
            disabled={busy}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
