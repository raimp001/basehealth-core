import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Providers } from "./providers"
import { SkipToContent, Announcer } from "@/components/ui/accessibility"
import { OfflineIndicator, UpdateBanner, InstallPrompt } from "@/hooks/use-pwa"
import { MinimalNavigation } from "@/components/layout/minimal-navigation"
import { EmergencyTriageBanner } from "@/components/safety/emergency-triage-banner"
import { AgentAssistFloating } from "@/components/agents/agent-assist-floating"

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_URL ||
  'https://www.basehealth.xyz'

const MINIAPP_EMBED_METADATA = {
  version: "next",
  imageUrl: `${APP_URL}/og-image.png`,
  button: {
    title: "Open BaseHealth",
    action: {
      // Base mini app clients expect launch_frame for mini app deep-links.
      type: "launch_frame",
      name: "BaseHealth",
      // url is optional; when omitted, clients default to the current page URL.
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: "#1a1a1a",
    },
  },
} as const

export const metadata: Metadata = {
  title: "BaseHealth - Healthcare Simplified",
  description:
    "Evidence-based health screenings, clinical trial matching, and expert care—all in one seamless platform.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-capable": "yes",
    // Base Mini App embed metadata
    "fc:miniapp": JSON.stringify(MINIAPP_EMBED_METADATA),
    // Some clients/documentation still reference fc:frame for the same embed payload.
    "fc:frame": JSON.stringify(MINIAPP_EMBED_METADATA),
  },
  openGraph: {
    title: "BaseHealth - Healthcare on Base",
    description: "Evidence-based health screenings, verified providers with on-chain attestations, and USDC payments on Base.",
    url: APP_URL,
    siteName: "BaseHealth",
    locale: "en_US",
    type: "website",
    images: [`${APP_URL}/og-image.png`],
  },
  twitter: {
    card: "summary_large_image",
    title: "BaseHealth - Healthcare on Base",
    description: "Evidence-based health screenings, verified providers, and USDC payments on Base.",
    images: [`${APP_URL}/og-image.png`],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#070A13" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#070A13" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Base app / base.dev URL verification */}
        <meta name="base:app_id" content="6990ef50e0d5d2cf831b5c38" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <SkipToContent />
        <Announcer />
        <Providers>
          <OfflineIndicator />
          <UpdateBanner />
          <EmergencyTriageBanner />
          <MinimalNavigation />
          <AgentAssistFloating />
          <main id="main-content" className="pt-20 md:pt-24 pb-24 md:pb-8">
            {children}
          </main>
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  )
}
