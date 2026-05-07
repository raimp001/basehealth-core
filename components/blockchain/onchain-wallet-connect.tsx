"use client"

import { useState, useEffect } from "react"
import {
  ConnectWallet,
  Wallet,
  WalletAdvancedAddressDetails,
  WalletAdvancedTokenHoldings,
  WalletAdvancedTransactionActions,
  WalletAdvancedWalletActions,
} from "@coinbase/onchainkit/wallet"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle } from "lucide-react"
import { onchainService } from "@/lib/onchain-service"

export function OnchainWalletConnect() {
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("basic")
  const network = onchainService.getNetworkConfig()

  // Reset error when tab changes
  useEffect(() => {
    setError(null)
  }, [activeTab])

  // Handle errors
  const handleError = (err: Error) => {
    console.error("Wallet error:", err)
    setError(err.message || "An error occurred with the wallet connection")
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Connect Your Wallet</CardTitle>
        <CardDescription>Connect your wallet to access healthcare services on Base</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="flex justify-center py-4">
              <ConnectWallet className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md" />
            </div>

            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-center text-muted-foreground">
                Connect your wallet to access healthcare services and make payments on the {network.chainName} network.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Wallet>
              <ConnectWallet className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md" />
              <div className="space-y-4 mt-4">
                <div className="bg-muted p-4 rounded-md">
                  <WalletAdvancedAddressDetails />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-sm font-medium mb-2">Token Holdings</h3>
                    <WalletAdvancedTokenHoldings />
                  </div>

                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-sm font-medium mb-2">Actions</h3>
                    <WalletAdvancedWalletActions />
                    <div className="mt-2">
                      <WalletAdvancedTransactionActions />
                    </div>
                  </div>
                </div>
              </div>
            </Wallet>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">Powered by OnchainKit on Base</p>
      </CardFooter>
    </Card>
  )
}
