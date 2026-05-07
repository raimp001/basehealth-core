import { Suspense } from "react"
import { WalletReceiptsClient } from "./client"

export const metadata = {
  title: "Base receipts | BaseHealth",
  description:
    "On-chain audit log for your BaseHealth payments. Every USDC settlement on Base is recorded here with a Basescan link.",
}

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-10">
            <div className="h-10 w-48 animate-pulse rounded-md bg-muted/40" />
            <div className="mt-6 h-72 animate-pulse rounded-xl bg-muted/30" />
          </main>
        }
      >
        <WalletReceiptsClient />
      </Suspense>
    </div>
  )
}
