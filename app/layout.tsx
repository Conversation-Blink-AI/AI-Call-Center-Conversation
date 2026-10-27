import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { WorkspaceProvider } from "@/contexts/workspace-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Conversation Call Flow Builder",
  description: "Create and manage AI phone call flows with Conversation.ai",
  generator: "v0.dev",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
        <Script id="trackpulse-config" strategy="beforeInteractive">
          {`window.tpAnalyticsConfig=${JSON.stringify({
            siteId: "6e45d0c8-3fa7-4eda-9792-7a9caad5abff",
            publicKey: "60108223b76260fdcaaf936a4db767b9147ea6e376ebfb55",
            autoTrack: true,
            collectUrl: "https://api.trackpulse.hustleapp.co/api/v1/web-analytics/collect",
          })};`}
        </Script>
        <Script
          src="https://api.trackpulse.hustleapp.co/web-analytics/tracker.js"
          strategy="afterInteractive"
        />
        <AuthProvider>
          <WorkspaceProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              disableTransitionOnChange
            >
              <Toaster />
              <SonnerToaster />
              {children}
            </ThemeProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  )
}