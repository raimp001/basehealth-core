/**
 * Ethereum Attestation Service (EAS) Integration for Base
 * 
 * Creates on-chain attestations for verified healthcare providers.
 * Attestations serve as verifiable proof of provider credentials.
 * 
 * EAS on Base: https://base.easscan.org
 */

import { ethers } from 'ethers'

// EAS Contract Addresses on Base
const EAS_CONTRACTS = {
  mainnet: {
    eas: '0x4200000000000000000000000000000000000021', // Base Mainnet EAS
    schemaRegistry: '0x4200000000000000000000000000000000000020',
  },
  sepolia: {
    eas: '0x4200000000000000000000000000000000000021', // Base Sepolia EAS
    schemaRegistry: '0x4200000000000000000000000000000000000020',
  },
}

// BaseHealth Provider Verification Schema
// Schema defines what data is included in the attestation
const PROVIDER_SCHEMA = 'string npi,string name,string specialty,bool npiVerified,bool oigCleared,bool samCleared,bool licenseVerified,uint64 verificationDate'

// Pre-registered schema UIDs
const SCHEMA_UIDS = {
  mainnet: process.env.EAS_SCHEMA_UID_MAINNET || '0xc418e5961df11f29f7e16d0a4d7450e9640a055822a8fd3c1edf90b425116fa5',
  sepolia: process.env.EAS_SCHEMA_UID_SEPOLIA || '0x0000000000000000000000000000000000000000000000000000000000000000',
}

// Minimal EAS ABI for attestations
const EAS_ABI = [
  'function attest((bytes32 schema, (address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value) data)) external payable returns (bytes32)',
  'function revoke((bytes32 schema, (bytes32 uid, uint256 value) data)) external payable',
  'function getAttestation(bytes32 uid) external view returns ((bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address attester, address recipient, bool revocable, bytes data))',
]

const SCHEMA_REGISTRY_ABI = [
  'function register(string schema, address resolver, bool revocable) external returns (bytes32)',
  'function getSchema(bytes32 uid) external view returns ((bytes32 uid, address resolver, bool revocable, string schema))',
]

export interface ProviderVerification {
  npi: string
  name: string
  specialty: string
  npiVerified: boolean
  oigCleared: boolean
  samCleared: boolean
  licenseVerified: boolean
  verificationDate: number
}

export interface AttestationResult {
  success: boolean
  uid?: string
  txHash?: string
  error?: string
  explorerUrl?: string
}

/**
 * Get the appropriate network configuration
 */
function getNetworkConfig() {
  const isTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === 'true' || process.env.NODE_ENV !== 'production'
  return {
    isTestnet,
    contracts: isTestnet ? EAS_CONTRACTS.sepolia : EAS_CONTRACTS.mainnet,
    schemaUid: isTestnet ? SCHEMA_UIDS.sepolia : SCHEMA_UIDS.mainnet,
    rpcUrl: isTestnet ? 'https://sepolia.base.org' : 'https://mainnet.base.org',
    explorerBase: isTestnet ? 'https://sepolia.basescan.org' : 'https://basescan.org',
    easScanBase: isTestnet ? 'https://base-sepolia.easscan.org' : 'https://base.easscan.org',
  }
}

/**
 * Get a signer for attestation transactions
 * Requires ATTESTATION_PRIVATE_KEY env var
 */
function getAttestationSigner(): ethers.Wallet | null {
  const privateKey = process.env.ATTESTATION_PRIVATE_KEY
  if (!privateKey) {
    console.warn('ATTESTATION_PRIVATE_KEY not set - attestations are disabled')
    return null
  }
  
  const config = getNetworkConfig()
  const provider = new ethers.JsonRpcProvider(config.rpcUrl)
  return new ethers.Wallet(privateKey, provider)
}

/**
 * Encode provider verification data for attestation
 */
function encodeProviderData(verification: ProviderVerification): string {
  const abiCoder = new ethers.AbiCoder()
  return abiCoder.encode(
    ['string', 'string', 'string', 'bool', 'bool', 'bool', 'bool', 'uint64'],
    [
      verification.npi,
      verification.name,
      verification.specialty,
      verification.npiVerified,
      verification.oigCleared,
      verification.samCleared,
      verification.licenseVerified,
      verification.verificationDate,
    ]
  )
}

/**
 * Create an on-chain attestation for a verified provider
 */
export async function createProviderAttestation(
  providerAddress: string,
  verification: ProviderVerification
): Promise<AttestationResult> {
  const config = getNetworkConfig()
  const signer = getAttestationSigner()
  
  // Without signer configuration, do not fabricate attestations.
  if (!signer) {
    return {
      success: false,
      error: 'ATTESTATION_PRIVATE_KEY is required to create on-chain attestations',
      explorerUrl: `${config.easScanBase}`,
    }
  }
  
  try {
    const easContract = new ethers.Contract(
      config.contracts.eas,
      EAS_ABI,
      signer
    )
    
    // Encode the attestation data
    const encodedData = encodeProviderData(verification)
    
    // Create attestation request
    const attestationRequest = {
      schema: config.schemaUid,
      data: {
        recipient: providerAddress,
        expirationTime: 0n, // No expiration
        revocable: true, // Can be revoked if provider loses credentials
        refUID: ethers.ZeroHash, // No reference
        data: encodedData,
        value: 0n,
      },
    }
    
    // Submit attestation transaction
    const tx = await easContract.attest(attestationRequest)
    const receipt = await tx.wait()
    
    // Extract attestation UID from logs
    const attestationUid = receipt.logs[0]?.topics[1] || ethers.ZeroHash
    
    console.log('Provider attestation created:', {
      uid: attestationUid,
      txHash: receipt.hash,
      provider: providerAddress,
    })
    
    return {
      success: true,
      uid: attestationUid,
      txHash: receipt.hash,
      explorerUrl: `${config.easScanBase}/attestation/view/${attestationUid}`,
    }
  } catch (error) {
    console.error('Failed to create attestation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Attestation failed',
    }
  }
}

/**
 * Revoke a provider's attestation (e.g., if license expires or exclusion found)
 */
export async function revokeProviderAttestation(
  attestationUid: string
): Promise<AttestationResult> {
  const config = getNetworkConfig()
  const signer = getAttestationSigner()
  
  if (!signer) {
    return {
      success: false,
      uid: attestationUid,
      error: 'ATTESTATION_PRIVATE_KEY is required to revoke on-chain attestations',
    }
  }
  
  try {
    const easContract = new ethers.Contract(
      config.contracts.eas,
      EAS_ABI,
      signer
    )
    
    const revocationRequest = {
      schema: config.schemaUid,
      data: {
        uid: attestationUid,
        value: 0n,
      },
    }
    
    const tx = await easContract.revoke(revocationRequest)
    const receipt = await tx.wait()
    
    console.log('Provider attestation revoked:', {
      uid: attestationUid,
      txHash: receipt.hash,
    })
    
    return {
      success: true,
      uid: attestationUid,
      txHash: receipt.hash,
    }
  } catch (error) {
    console.error('Failed to revoke attestation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Revocation failed',
    }
  }
}

/**
 * Verify an attestation exists and is valid
 */
export async function verifyProviderAttestation(
  attestationUid: string
): Promise<{
  valid: boolean
  attestation?: any
  error?: string
}> {
  const config = getNetworkConfig()
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl)
    const easContract = new ethers.Contract(
      config.contracts.eas,
      EAS_ABI,
      provider
    )
    
    const attestation = await easContract.getAttestation(attestationUid)
    
    // Check if attestation exists and is not revoked
    const isValid = attestation.uid !== ethers.ZeroHash && attestation.revocationTime === 0n
    
    return {
      valid: isValid,
      attestation: {
        uid: attestation.uid,
        schema: attestation.schema,
        time: Number(attestation.time),
        expirationTime: Number(attestation.expirationTime),
        revocationTime: Number(attestation.revocationTime),
        attester: attestation.attester,
        recipient: attestation.recipient,
      },
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }
  }
}

/**
 * Register the BaseHealth provider schema (one-time setup)
 */
export async function registerProviderSchema(): Promise<{
  success: boolean
  schemaUid?: string
  error?: string
}> {
  const config = getNetworkConfig()
  const signer = getAttestationSigner()
  
  if (!signer) {
    return {
      success: false,
      error: 'ATTESTATION_PRIVATE_KEY required to register schema',
    }
  }
  
  try {
    const schemaRegistry = new ethers.Contract(
      config.contracts.schemaRegistry,
      SCHEMA_REGISTRY_ABI,
      signer
    )
    
    const tx = await schemaRegistry.register(
      PROVIDER_SCHEMA,
      ethers.ZeroAddress, // No resolver
      true // Revocable
    )
    
    const receipt = await tx.wait()
    const schemaUid = receipt.logs[0]?.topics[1]
    
    console.log('Schema registered:', {
      uid: schemaUid,
      schema: PROVIDER_SCHEMA,
    })
    
    return {
      success: true,
      schemaUid,
    }
  } catch (error) {
    console.error('Failed to register schema:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Schema registration failed',
    }
  }
}

/**
 * Get EAS scan URL for an attestation
 */
export function getAttestationUrl(uid: string): string {
  const config = getNetworkConfig()
  return `${config.easScanBase}/attestation/view/${uid}`
}

/**
 * Export configuration for frontend use
 */
export const easConfig = {
  getNetworkConfig,
  schema: PROVIDER_SCHEMA,
}
