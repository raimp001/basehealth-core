import { NETWORK_CONFIG, NETWORK_ID, SUPPORTED_TOKENS } from "./constants"

export interface WalletInfo {
  address: string | null
  chainId: string | null
  isConnected: boolean
}

class WalletService {
  // Check if wallet is available in browser
  isWalletAvailable(): boolean {
    return typeof window !== "undefined" && window.ethereum !== undefined
  }

  // Get current network configuration
  getNetworkConfig() {
    return NETWORK_CONFIG[NETWORK_ID as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG["base-sepolia"]
  }

  // Get supported tokens for current network
  getSupportedTokens() {
    return SUPPORTED_TOKENS[NETWORK_ID as keyof typeof SUPPORTED_TOKENS] || SUPPORTED_TOKENS["base-sepolia"]
  }

  // Request wallet connection
  async connectWallet(): Promise<WalletInfo> {
    if (!this.isWalletAvailable()) {
      throw new Error("No Ethereum wallet detected. Please install MetaMask or another wallet.")
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      const chainId = await window.ethereum.request({ method: "eth_chainId" })

      return {
        address: accounts[0] || null,
        chainId,
        isConnected: !!accounts[0],
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      throw error
    }
  }

  // Switch to the required network
  async switchToNetwork(): Promise<boolean> {
    if (!this.isWalletAvailable()) {
      throw new Error("No Ethereum wallet detected")
    }

    const network = this.getNetworkConfig()

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainId }],
      })
      return true
    } catch (error: any) {
      // If the chain hasn't been added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: network.chainId,
                chainName: network.chainName,
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.blockExplorer],
                nativeCurrency: {
                  name: network.currencySymbol,
                  symbol: network.currencySymbol,
                  decimals: 18,
                },
              },
            ],
          })
          return true
        } catch (addError) {
          console.error("Error adding network:", addError)
          return false
        }
      }
      console.error("Error switching network:", error)
      return false
    }
  }

  // Get current wallet info
  async getWalletInfo(): Promise<WalletInfo> {
    if (!this.isWalletAvailable()) {
      return { address: null, chainId: null, isConnected: false }
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" })
      const chainId = await window.ethereum.request({ method: "eth_chainId" })

      return {
        address: accounts[0] || null,
        chainId,
        isConnected: !!accounts[0],
      }
    } catch (error) {
      console.error("Error getting wallet info:", error)
      return { address: null, chainId: null, isConnected: false }
    }
  }

  // Format address for display
  formatAddress(address: string | null): string {
    if (!address) return ""
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }
}

// Create singleton instance
export const walletService = new WalletService()

// Add TypeScript definitions for window.ethereum
// window.ethereum is declared in types/modules.d.ts
