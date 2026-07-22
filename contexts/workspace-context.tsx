"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/contexts/auth-context"

export type WorkspaceState = {
  orgId: string
  orgName: string
  adminEmail: string | null
  adminUserId: string
  adminSource?: string
  callCenterRole: string | null
  membershipRole: string | null
}

type WorkspaceContextType = {
  workspace: WorkspaceState | null
  loading: boolean
  switchWorkspace: (orgId: string) => Promise<{ success: boolean; message?: string }>
  exitWorkspace: () => Promise<{ success: boolean; message?: string }>
  refreshWorkspace: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshWorkspace = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspace(null)
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/workspace/current", {
        credentials: "include",
        cache: "no-store",
      })

      if (!response.ok) {
        setWorkspace(null)
        return
      }

      const data = await response.json()
      setWorkspace(data.workspace || null)
    } catch (error) {
      console.error("[WORKSPACE] Failed to load current workspace:", error)
      setWorkspace(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      setWorkspace(null)
      setLoading(false)
      return
    }

    setLoading(true)
    void refreshWorkspace()
  }, [authLoading, isAuthenticated, refreshWorkspace])

  const switchWorkspace = useCallback(
    async (orgId: string) => {
      try {
        const response = await fetch("/api/workspace/switch", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId }),
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          return {
            success: false,
            message: data.error || "Failed to switch workspace",
          }
        }

        setWorkspace(data.workspace || null)
        return { success: true }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to switch workspace"
        return { success: false, message }
      }
    },
    [],
  )

  const exitWorkspace = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace/exit", {
        method: "POST",
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        return {
          success: false,
          message: data.error || "Failed to exit workspace",
        }
      }

      setWorkspace(null)
      return { success: true }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to exit workspace"
      return { success: false, message }
    }
  }, [])

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        loading,
        switchWorkspace,
        exitWorkspace,
        refreshWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}
