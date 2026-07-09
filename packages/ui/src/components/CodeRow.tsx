import { useState } from "react"
import { Copy, Check, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Account } from "@bpass/core"
import { generateCode, secondsRemaining } from "@bpass/core"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

interface CodeRowProps {
  account: Account
  now: number
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}

function formatCode(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`
  return code
}

function initials(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed[0].toUpperCase() : "?"
}

export function CodeRow({ account, now, onEdit, onDelete }: CodeRowProps) {
  const [copied, setCopied] = useState(false)
  const code = generateCode(account, now)
  const remaining = secondsRemaining(account.period, now)
  const progress = remaining / account.period
  const urgent = remaining <= 5
  const title = account.issuer || "Unknown"

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.replace(/\s/g, ""))
      setCopied(true)
      toast.success("Code copied")
      setTimeout(() => setCopied(false), 1200)
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  return (
    <article className="w-full min-w-0 overflow-hidden rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-accent/30">
      <div className="flex gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
          aria-hidden="true"
        >
          {initials(account.issuer || account.label)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
                {title}
              </h3>
              {account.label ? (
                <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">
                  {account.label}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <CountdownRing
                progress={progress}
                remaining={remaining}
                urgent={urgent}
              />
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={`Options for ${title}`}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" className="z-[100]">
                  <DropdownMenuItem onSelect={() => onEdit(account)}>
                    <Pencil className="mr-2 size-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDelete(account)}
                  >
                    <Trash2 className="mr-2 size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void copy()}
            className="mt-2.5 flex w-full min-w-0 items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-left transition-colors hover:bg-muted/70"
            title="Click to copy code"
          >
            <span className="min-w-0 truncate font-mono text-[clamp(1rem,7vw,1.25rem)] font-bold leading-none tracking-[0.12em] text-foreground tabular-nums">
              {formatCode(code)}
            </span>
            <span className="flex size-7 shrink-0 items-center justify-center text-muted-foreground">
              {copied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </span>
          </button>
        </div>
      </div>
    </article>
  )
}

function CountdownRing({
  progress,
  remaining,
  urgent,
}: {
  progress: number
  remaining: number
  urgent: boolean
}) {
  const radius = 11
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)
  return (
    <div
      className="relative size-8 shrink-0"
      aria-label={`${remaining} seconds remaining`}
    >
      <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          className="stroke-muted"
        />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={
            urgent ? "stroke-red-500 transition-all" : "stroke-primary transition-all"
          }
        />
      </svg>
      <span
        className={
          "absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums " +
          (urgent ? "text-red-500" : "text-muted-foreground")
        }
      >
        {remaining}
      </span>
    </div>
  )
}
