"use client"

import Link from "next/link"
import { Building2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/workspace-context"
import { toast } from "sonner"

export function WorkspaceBanner() {
  const { workspace, exitWorkspace, loading } = useWorkspace()

  if (loading || !workspace) {
    return null
  }

  const handleExit = async () => {
    const result = await exitWorkspace()
    if (!result.success) {
      toast.error(result.message || "Failed to exit workspace")
      return
    }
    toast.success("Returned to personal workspace")
    window.location.reload()
  }

  return (
    <div className="sticky top-0 z-30 border-b border-purple-500/30 bg-purple-500/10 px-4 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm text-purple-100">
          <Building2 className="h-4 w-4 shrink-0 text-purple-300" />
          <span className="truncate">
            Workspace: <span className="font-medium text-white">{workspace.orgName}</span>
            {workspace.adminEmail ? (
              <>
                {" "}
                (admin: <span className="font-medium text-white">{workspace.adminEmail}</span>)
              </>
            ) : null}
          </span>
          <Link
            href="/dashboard/organization"
            className="hidden text-purple-300 underline-offset-2 hover:underline sm:inline"
          >
            Manage
          </Link>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-purple-400/40 bg-transparent text-purple-100 hover:bg-purple-500/20 hover:text-white"
          onClick={handleExit}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Exit
        </Button>
      </div>
    </div>
  )
}
