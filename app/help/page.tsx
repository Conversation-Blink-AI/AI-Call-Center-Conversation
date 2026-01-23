"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HelpRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/help")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Redirecting to Help Center...</p>
    </div>
  )
}
