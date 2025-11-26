
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"

export interface UserCall {
  id: string
  to_number: string
  from_number: string
  status: string
  duration: number
  start_time: string
  pathway_id?: string
  pathway_name?: string
  outcome?: string
  recording_url?: string
  transcript?: string
  summary?: string
  ended_reason?: string
  call_successful?: boolean
  variables?: any
}

export interface UserCallData {
  calls: UserCall[]
  totalCalls: number
  userPhoneNumber: string | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  hasMore: boolean
  currentPage: number
}

interface UseUserCallDataOptions {
  limit?: number
  autoFetch?: boolean
}

export function useUserCallData(options: UseUserCallDataOptions = {}) {
  const { limit = 100, autoFetch = true } = options
  const { user, loading: authLoading } = useAuth()
  const hasInitialized = useRef(false)
  const isCurrentlyFetching = useRef(false)

  const [callData, setCallData] = useState<UserCallData>({
    calls: [],
    totalCalls: 0,
    userPhoneNumber: null,
    loading: true,
    error: null,
    lastUpdated: null,
    hasMore: false,
    currentPage: 1,
  })

  const fetchUserCallData = useCallback(async (page: number = 1, resetData: boolean = true) => {
    if (!user || authLoading || isCurrentlyFetching.current) {
      console.log("📱 [USE-USER-CALL-DATA] Skipping fetch - conditions not met")
      return
    }

    try {
      isCurrentlyFetching.current = true
      
      if (resetData) {
        setCallData((prev) => ({ ...prev, loading: true, error: null }))
      }

      console.log("📱 [USE-USER-CALL-DATA] Fetching data for user:", user.id, "page:", page)

      // 1. Get user's phone numbers from the authenticated API (only on first load)
      let userPhoneNumber = callData.userPhoneNumber
      if (!userPhoneNumber || resetData) {
        const phoneResponse = await fetch(`/api/user/phone-numbers`, {
          method: "GET",
          credentials: "include",
        })

        if (!phoneResponse.ok) {
          throw new Error(`Failed to fetch phone numbers: ${phoneResponse.status}`)
        }

        const phoneData = await phoneResponse.json()

        if (!phoneData.success || !phoneData.phoneNumbers || phoneData.phoneNumbers.length === 0) {
          console.log("📱 [USE-USER-CALL-DATA] No phone numbers found")
          setCallData({
            calls: [],
            totalCalls: 0,
            userPhoneNumber: null,
            loading: false,
            error: null,
            lastUpdated: new Date(),
            hasMore: false,
            currentPage: 1,
          })
          return
        }

        userPhoneNumber = phoneData.phoneNumbers[0].number
        console.log("📱 [USE-USER-CALL-DATA] User phone number:", userPhoneNumber)
      }

      // 2. Fetch calls from Bland.ai via our new calls endpoint
      const response = await fetch(`/api/bland-ai/calls?limit=${limit}&page=${page}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch calls: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      console.log("✅ [USE-USER-CALL-DATA] Fetched calls:", {
        count: data.calls?.length || 0,
        total: data.total,
        hasMore: data.has_more,
        page: page,
      })

      // Transform the calls to match our interface
      const transformedCalls: UserCall[] = (data.calls || []).map((call: any) => ({
        id: call.call_id,
        to_number: call.to || call.to_number || "",
        from_number: call.from || call.from_number || "",
        status: call.queue_status || call.status || (call.call_successful ? "completed" : "failed"),
        duration: Math.round((call.call_length || 0) * 60), // Convert minutes to seconds
        start_time: call.created_at || call.start_time || new Date().toISOString(),
        pathway_id: call.pathway_id,
        pathway_name: call.pathway_name,
        outcome: call.answered_by,
        recording_url: call.recording_url,
        transcript: call.transcript,
        summary: call.summary,
        ended_reason: call.ended_reason,
        call_successful: call.call_successful,
        variables: call.variables,
      }))

      setCallData((prev) => ({
        calls: resetData ? transformedCalls : [...prev.calls, ...transformedCalls],
        totalCalls: data.total || transformedCalls.length,
        userPhoneNumber,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        hasMore: data.has_more || false,
        currentPage: page,
      }))

      // Auto-sync the fetched data to database
      if (transformedCalls.length > 0) {
        try {
          console.log("🔄 [USE-USER-CALL-DATA] Auto-syncing calls to database...")
          const syncResponse = await fetch('/api/calls/auto-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              calls: transformedCalls,
              userId: user.id
            })
          })

          if (syncResponse.ok) {
            const syncResult = await syncResponse.json()
            console.log("✅ [USE-USER-CALL-DATA] Auto-sync completed:", syncResult.syncedCount, "calls")
          } else {
            console.warn("⚠️ [USE-USER-CALL-DATA] Auto-sync failed:", syncResponse.status)
          }
        } catch (syncError) {
          console.warn("⚠️ [USE-USER-CALL-DATA] Auto-sync error:", syncError)
          // Don't fail the main operation if sync fails
        }
      }

      console.log("✅ [USE-USER-CALL-DATA] Data transformed successfully:", {
        transformedCount: transformedCalls.length,
        totalLoaded: resetData ? transformedCalls.length : callData.calls.length + transformedCalls.length,
        hasMore: data.has_more,
      })
    } catch (error: any) {
      console.error("❌ [USE-USER-CALL-DATA] Error:", error)
      setCallData((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }))
    } finally {
      isCurrentlyFetching.current = false
    }
  }, [user, authLoading, limit, callData.userPhoneNumber, callData.calls.length])

  // Load more data for pagination
  const loadMore = useCallback(() => {
    if (callData.hasMore && !isCurrentlyFetching.current) {
      fetchUserCallData(callData.currentPage + 1, false)
    }
  }, [callData.hasMore, callData.currentPage, fetchUserCallData])

  // Refresh data (reset and reload)
  const refresh = useCallback(() => {
    hasInitialized.current = false
    fetchUserCallData(1, true)
  }, [fetchUserCallData])

  // Only fetch once when component mounts and user is ready
  useEffect(() => {
    if (!authLoading && user && !hasInitialized.current && autoFetch) {
      hasInitialized.current = true
      console.log("📱 [USE-USER-CALL-DATA] Initializing data fetch")
      fetchUserCallData(1, true)
    }
  }, [user, authLoading, fetchUserCallData, autoFetch])

  return {
    ...callData,
    refetch: refresh,
    loadMore,
    isLoading: isCurrentlyFetching.current,
  }
}
