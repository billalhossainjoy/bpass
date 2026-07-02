import { useRef, useState } from "react"
import { Camera, Upload, KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Account, OtpAlgorithm } from "@bpass/core"
import {
  decodeQrFromDataUrl,
  decodeQrFromFile,
  isValidSecret,
  normalizeSecret,
  parseOtpAuthUri,
} from "@bpass/core"
import { usePlatform } from "../platform"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

type NewAccount = Omit<Account, "id" | "createdAt">

interface AddAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (account: NewAccount) => Promise<void>
}

export function AddAccountDialog({
  open,
  onOpenChange,
  onAdd,
}: AddAccountDialogProps) {
  const { canCaptureTab, captureVisibleTab } = usePlatform()
  const [tab, setTab] = useState("scan")
  const [busy, setBusy] = useState(false)

  // Manual fields
  const [issuer, setIssuer] = useState("")
  const [label, setLabel] = useState("")
  const [secret, setSecret] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [algorithm, setAlgorithm] = useState<OtpAlgorithm>("SHA1")
  const [digits, setDigits] = useState(6)
  const [period, setPeriod] = useState(30)

  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setIssuer("")
    setLabel("")
    setSecret("")
    setShowAdvanced(false)
    setAlgorithm("SHA1")
    setDigits(6)
    setPeriod(30)
    setTab("scan")
  }

  const close = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleParsedUri = async (uri: string) => {
    const parsed = parseOtpAuthUri(uri)
    await onAdd({
      issuer: parsed.issuer,
      label: parsed.label,
      secret: parsed.secret,
      algorithm: parsed.algorithm,
      digits: parsed.digits,
      period: parsed.period,
    })
    toast.success(`Added ${parsed.issuer || parsed.label || "account"}`)
    close(false)
  }

  const handleCapture = async () => {
    if (!captureVisibleTab) return
    setBusy(true)
    try {
      const dataUrl = await captureVisibleTab()
      const decoded = await decodeQrFromDataUrl(dataUrl)
      if (!decoded) {
        toast.error("No QR code found on the visible tab.")
        return
      }
      await handleParsedUri(decoded)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Capture failed.")
    } finally {
      setBusy(false)
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const decoded = await decodeQrFromFile(file)
      if (!decoded) {
        toast.error("No QR code found in that image.")
        return
      }
      await handleParsedUri(decoded)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read image.")
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleManualSubmit = async () => {
    if (!isValidSecret(secret)) {
      toast.error("Enter a valid base32 secret key.")
      return
    }
    setBusy(true)
    try {
      await onAdd({
        issuer: issuer.trim() || "Unknown",
        label: label.trim(),
        secret: normalizeSecret(secret),
        algorithm,
        digits,
        period,
      })
      toast.success(`Added ${issuer.trim() || "account"}`)
      close(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add account.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>
            Scan a QR code on screen or enter the secret manually.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan">
              <Camera className="mr-1.5 size-4" /> Scan
            </TabsTrigger>
            <TabsTrigger value="manual">
              <KeyRound className="mr-1.5 size-4" /> Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              {canCaptureTab
                ? "Open the page showing your QR code in the active tab, then capture it. Or upload a screenshot image."
                : "Upload a screenshot or photo of your QR code, or switch to Manual entry."}
            </p>
            {canCaptureTab && (
              <Button
                className="w-full"
                onClick={handleCapture}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 size-4" />
                )}
                Capture current tab
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Upload className="mr-2 size-4" /> Upload QR image
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="issuer">Platform name</Label>
              <Input
                id="issuer"
                placeholder="e.g. GitHub"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="label">Account (optional)</Label>
              <Input
                id="label"
                placeholder="e.g. you@email.com"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secret">Secret key</Label>
              <Input
                id="secret"
                placeholder="JBSWY3DPEHPK3PXP"
                autoCapitalize="characters"
                spellCheck={false}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="font-mono"
              />
            </div>

            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setShowAdvanced((s) => !s)}
            >
              {showAdvanced ? "Hide" : "Show"} advanced options
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Algorithm</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                    value={algorithm}
                    onChange={(e) =>
                      setAlgorithm(e.target.value as OtpAlgorithm)
                    }
                  >
                    <option value="SHA1">SHA1</option>
                    <option value="SHA256">SHA256</option>
                    <option value="SHA512">SHA512</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Digits</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                    value={digits}
                    onChange={(e) => setDigits(Number(e.target.value))}
                  >
                    <option value={6}>6</option>
                    <option value={7}>7</option>
                    <option value={8}>8</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Period</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                  >
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                  </select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                className="w-full"
                onClick={handleManualSubmit}
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Add account
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
