/**
 * Base Attestation Service
 * 
 * Uses Ethereum Attestation Service (EAS) on Base to create
 * verifiable on-chain credentials for healthcare providers,
 * visits, and reviews.
 * 
 * EAS Contract on Base Mainnet: 0x4200000000000000000000000000000000000021
 * EAS Contract on Base Sepolia: 0x4200000000000000000000000000000000000021
 * 
 * @see https://docs.attest.sh/docs/welcome
 */

import { EAS, SchemaEncoder, SchemaRegistry } from '@ethereum-attestation-service/eas-sdk'
import { ethers } from 'ethers'
import { logger } from './logger'

// =============================================================================
// CONFIGURATION
// =============================================================================

// EAS contracts are at the same address on Base mainnet and Sepolia
const EAS_CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000021'
const SCHEMA_REGISTRY_ADDRESS = '0x4200000000000000000000000000000000000020'

// Base RPC endpoints
const BASE_MAINNET_RPC = 'https://mainnet.base.org'
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org'

// Determine network based on environment
const isProduction = process.env.NODE_ENV === 'production'
const RPC_URL = isProduction ? BASE_MAINNET_RPC : BASE_SEPOLIA_RPC
const EXPLORER_BASE = isProduction 
  ? 'https://base.easscan.org' 
  : 'https://base-sepolia.easscan.org'

// Platform attestor wallet (signs attestations)
const ATTESTOR_PRIVATE_KEY = process.env.ATTESTOR_PRIVATE_KEY || ''

// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================

/**
 * Schema for provider credentials attestation
 * Attests that a provider has valid NPI and license
 */
export const PROVIDER_CREDENTIAL_SCHEMA = {
  name: 'BaseHealthProviderCredential',
  description: 'Attestation that a healthcare provider has verified credentials',
  schema: 'string npiNumber,string licenseNumber,string licenseState,string providerType,string specialty,bool npiVerified,bool licenseVerified,uint64 verifiedAt',
  revocable: true,
  // Schema UID will be set after registration
  uid: process.env.PROVIDER_CREDENTIAL_SCHEMA_UID || '',
}

/**
 * Schema for visit completion attestation
 * Attests that a healthcare visit occurred
 */
export const VISIT_ATTESTATION_SCHEMA = {
  name: 'BaseHealthVisitAttestation',
  description: 'Attestation that a healthcare visit was completed',
  schema: 'bytes32 visitHash,string visitType,uint64 visitDate,bool completed,string providerNpi',
  revocable: false, // Visits can't be un-happened
  uid: process.env.VISIT_ATTESTATION_SCHEMA_UID || '',
}

/**
 * Schema for patient review attestation
 * Attests that a patient submitted a verified review
 */
export const REVIEW_ATTESTATION_SCHEMA = {
  name: 'BaseHealthReviewAttestation',
  description: 'Sybil-resistant review attestation tied to a visit',
  schema: 'bytes32 visitAttestationUid,uint8 rating,bytes32 reviewHash,uint64 reviewDate',
  revocable: true, // Reviews can be taken down
  uid: process.env.REVIEW_ATTESTATION_SCHEMA_UID || '',
}

/**
 * Schema for screening completion attestation
 * Attests that a health screening was completed
 */
export const SCREENING_ATTESTATION_SCHEMA = {
  name: 'BaseHealthScreeningAttestation',
  description: 'Attestation that a health screening was completed',
  schema: 'bytes32 screeningHash,string screeningType,uint64 completedAt,bool resultAvailable',
  revocable: false,
  uid: process.env.SCREENING_ATTESTATION_SCHEMA_UID || '',
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ProviderCredentialData {
  npiNumber: string
  licenseNumber: string
  licenseState: string
  providerType: string
  specialty: string
  npiVerified: boolean
  licenseVerified: boolean
}

export interface VisitAttestationData {
  visitId: string
  visitType: string
  visitDate: Date
  completed: boolean
  providerNpi: string
}

export interface ReviewAttestationData {
  visitAttestationUid: string
  rating: number // 1-5
  reviewText: string
}

export interface ScreeningAttestationData {
  screeningId: string
  screeningType: string
  completedAt: Date
  resultAvailable: boolean
}

export interface AttestationResult {
  success: boolean
  uid?: string
  txHash?: string
  explorerUrl?: string
  error?: string
}

// =============================================================================
// ATTESTATION SERVICE
// =============================================================================

/**
 * Get configured EAS instance
 */
function getEAS(): { eas: EAS; signer: ethers.Signer } | null {
  if (!ATTESTOR_PRIVATE_KEY) {
    logger.warn('ATTESTOR_PRIVATE_KEY not configured - attestations disabled')
    return null
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const signer = new ethers.Wallet(ATTESTOR_PRIVATE_KEY, provider)
    const eas = new EAS(EAS_CONTRACT_ADDRESS)
    eas.connect(signer)
    
    return { eas, signer }
  } catch (error) {
    logger.error('Failed to initialize EAS', error)
    return null
  }
}

/**
 * Create a provider credential attestation
 * Called when a provider's credentials are verified during onboarding
 */
export async function attestProviderCredential(
  recipientAddress: string,
  data: ProviderCredentialData
): Promise<AttestationResult> {
  const easConfig = getEAS()
  
  if (!easConfig) {
    return {
      success: false,
      error: 'ATTESTOR_PRIVATE_KEY not configured',
      explorerUrl: EXPLORER_BASE,
    }
  }
  
  const { eas } = easConfig
  
  try {
    const schemaEncoder = new SchemaEncoder(PROVIDER_CREDENTIAL_SCHEMA.schema)
    const encodedData = schemaEncoder.encodeData([
      { name: 'npiNumber', value: data.npiNumber, type: 'string' },
      { name: 'licenseNumber', value: data.licenseNumber, type: 'string' },
      { name: 'licenseState', value: data.licenseState, type: 'string' },
      { name: 'providerType', value: data.providerType, type: 'string' },
      { name: 'specialty', value: data.specialty, type: 'string' },
      { name: 'npiVerified', value: data.npiVerified, type: 'bool' },
      { name: 'licenseVerified', value: data.licenseVerified, type: 'bool' },
      { name: 'verifiedAt', value: BigInt(Math.floor(Date.now() / 1000)), type: 'uint64' },
    ])
    
    const tx = await eas.attest({
      schema: PROVIDER_CREDENTIAL_SCHEMA.uid,
      data: {
        recipient: recipientAddress,
        expirationTime: 0n, // No expiration
        revocable: PROVIDER_CREDENTIAL_SCHEMA.revocable,
        data: encodedData,
      },
    })
    
    const uid = await tx.wait()
    
    logger.info('Provider credential attestation created', {
      uid,
      npi: data.npiNumber,
      recipient: recipientAddress,
    })
    
    return {
      success: true,
      uid,
      txHash: tx.receipt?.hash || "",
      explorerUrl: `${EXPLORER_BASE}/attestation/view/${uid}`,
    }
    
  } catch (error) {
    logger.error('Failed to create provider credential attestation', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Attestation failed',
    }
  }
}

/**
 * Create a visit completion attestation
 * Called when a healthcare visit is marked complete
 */
export async function attestVisitCompletion(
  patientAddress: string,
  data: VisitAttestationData
): Promise<AttestationResult> {
  const easConfig = getEAS()
  
  if (!easConfig) {
    return {
      success: false,
      error: 'ATTESTOR_PRIVATE_KEY not configured',
      explorerUrl: EXPLORER_BASE,
    }
  }
  
  const { eas } = easConfig
  
  try {
    // Hash the visit ID for privacy
    const visitHash = ethers.keccak256(ethers.toUtf8Bytes(data.visitId))
    
    const schemaEncoder = new SchemaEncoder(VISIT_ATTESTATION_SCHEMA.schema)
    const encodedData = schemaEncoder.encodeData([
      { name: 'visitHash', value: visitHash, type: 'bytes32' },
      { name: 'visitType', value: data.visitType, type: 'string' },
      { name: 'visitDate', value: BigInt(Math.floor(data.visitDate.getTime() / 1000)), type: 'uint64' },
      { name: 'completed', value: data.completed, type: 'bool' },
      { name: 'providerNpi', value: data.providerNpi, type: 'string' },
    ])
    
    const tx = await eas.attest({
      schema: VISIT_ATTESTATION_SCHEMA.uid,
      data: {
        recipient: patientAddress,
        expirationTime: 0n,
        revocable: VISIT_ATTESTATION_SCHEMA.revocable,
        data: encodedData,
      },
    })
    
    const uid = await tx.wait()
    
    logger.info('Visit attestation created', { uid, visitId: data.visitId })
    
    return {
      success: true,
      uid,
      txHash: tx.receipt?.hash || "",
      explorerUrl: `${EXPLORER_BASE}/attestation/view/${uid}`,
    }
    
  } catch (error) {
    logger.error('Failed to create visit attestation', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Attestation failed',
    }
  }
}

/**
 * Create a review attestation
 * Tied to a visit attestation to prevent sybil attacks
 */
export async function attestReview(
  reviewerAddress: string,
  data: ReviewAttestationData
): Promise<AttestationResult> {
  const easConfig = getEAS()
  
  if (!easConfig) {
    return {
      success: false,
      error: 'ATTESTOR_PRIVATE_KEY not configured',
      explorerUrl: EXPLORER_BASE,
    }
  }
  
  const { eas } = easConfig
  
  try {
    // Hash the review text for privacy
    const reviewHash = ethers.keccak256(ethers.toUtf8Bytes(data.reviewText))
    
    const schemaEncoder = new SchemaEncoder(REVIEW_ATTESTATION_SCHEMA.schema)
    const encodedData = schemaEncoder.encodeData([
      { name: 'visitAttestationUid', value: data.visitAttestationUid, type: 'bytes32' },
      { name: 'rating', value: data.rating, type: 'uint8' },
      { name: 'reviewHash', value: reviewHash, type: 'bytes32' },
      { name: 'reviewDate', value: BigInt(Math.floor(Date.now() / 1000)), type: 'uint64' },
    ])
    
    const tx = await eas.attest({
      schema: REVIEW_ATTESTATION_SCHEMA.uid,
      data: {
        recipient: reviewerAddress,
        expirationTime: 0n,
        revocable: REVIEW_ATTESTATION_SCHEMA.revocable,
        data: encodedData,
      },
    })
    
    const uid = await tx.wait()
    
    logger.info('Review attestation created', { uid, rating: data.rating })
    
    return {
      success: true,
      uid,
      txHash: tx.receipt?.hash || "",
      explorerUrl: `${EXPLORER_BASE}/attestation/view/${uid}`,
    }
    
  } catch (error) {
    logger.error('Failed to create review attestation', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Attestation failed',
    }
  }
}

/**
 * Create a screening completion attestation
 */
export async function attestScreeningCompletion(
  patientAddress: string,
  data: ScreeningAttestationData
): Promise<AttestationResult> {
  const easConfig = getEAS()
  
  if (!easConfig) {
    return {
      success: false,
      error: 'ATTESTOR_PRIVATE_KEY not configured',
      explorerUrl: EXPLORER_BASE,
    }
  }
  
  const { eas } = easConfig
  
  try {
    const screeningHash = ethers.keccak256(ethers.toUtf8Bytes(data.screeningId))
    
    const schemaEncoder = new SchemaEncoder(SCREENING_ATTESTATION_SCHEMA.schema)
    const encodedData = schemaEncoder.encodeData([
      { name: 'screeningHash', value: screeningHash, type: 'bytes32' },
      { name: 'screeningType', value: data.screeningType, type: 'string' },
      { name: 'completedAt', value: BigInt(Math.floor(data.completedAt.getTime() / 1000)), type: 'uint64' },
      { name: 'resultAvailable', value: data.resultAvailable, type: 'bool' },
    ])
    
    const tx = await eas.attest({
      schema: SCREENING_ATTESTATION_SCHEMA.uid,
      data: {
        recipient: patientAddress,
        expirationTime: 0n,
        revocable: SCREENING_ATTESTATION_SCHEMA.revocable,
        data: encodedData,
      },
    })
    
    const uid = await tx.wait()
    
    logger.info('Screening attestation created', { uid, type: data.screeningType })
    
    return {
      success: true,
      uid,
      txHash: tx.receipt?.hash || "",
      explorerUrl: `${EXPLORER_BASE}/attestation/view/${uid}`,
    }
    
  } catch (error) {
    logger.error('Failed to create screening attestation', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Attestation failed',
    }
  }
}

/**
 * Revoke an attestation
 * Used for credential revocation (e.g., license expired)
 */
export async function revokeAttestation(
  attestationUid: string,
  schemaUid: string
): Promise<AttestationResult> {
  const easConfig = getEAS()
  
  if (!easConfig) {
    return {
      success: false,
      uid: attestationUid,
      error: 'ATTESTOR_PRIVATE_KEY not configured',
    }
  }
  
  const { eas } = easConfig
  
  try {
    const tx = await eas.revoke({
      schema: schemaUid,
      data: {
        uid: attestationUid,
      },
    })
    
    await tx.wait()
    
    logger.info('Attestation revoked', { uid: attestationUid })
    
    return {
      success: true,
      uid: attestationUid,
      txHash: tx.receipt?.hash || "",
    }
    
  } catch (error) {
    logger.error('Failed to revoke attestation', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Revocation failed',
    }
  }
}

/**
 * Verify an attestation exists and is valid
 */
export async function verifyAttestation(
  attestationUid: string
): Promise<{ valid: boolean; revoked: boolean; data?: any }> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const eas = new EAS(EAS_CONTRACT_ADDRESS)
    eas.connect(provider)
    const attestation = await eas.getAttestation(attestationUid)
    
    return {
      valid: true,
      revoked: attestation.revocationTime > 0n,
      data: {
        recipient: attestation.recipient,
        attester: attestation.attester,
        time: new Date(Number(attestation.time) * 1000),
        expirationTime: attestation.expirationTime > 0n 
          ? new Date(Number(attestation.expirationTime) * 1000) 
          : null,
      },
    }
    
  } catch (error) {
    return { valid: false, revoked: false }
  }
}

/**
 * Register schemas (one-time setup)
 * Run this once to create the schemas on-chain
 */
export async function registerSchemas(): Promise<{
  providerCredentialUid: string
  visitAttestationUid: string
  reviewAttestationUid: string
  screeningAttestationUid: string
}> {
  const easConfig = getEAS()
  
  if (!easConfig) {
    throw new Error('ATTESTOR_PRIVATE_KEY required to register schemas')
  }
  
  const { signer } = easConfig
  const schemaRegistry = new SchemaRegistry(SCHEMA_REGISTRY_ADDRESS)
  schemaRegistry.connect(signer)
  
  // Register each schema
  const schemas = [
    PROVIDER_CREDENTIAL_SCHEMA,
    VISIT_ATTESTATION_SCHEMA,
    REVIEW_ATTESTATION_SCHEMA,
    SCREENING_ATTESTATION_SCHEMA,
  ]
  
  const uids: string[] = []
  
  for (const schema of schemas) {
    const tx = await schemaRegistry.register({
      schema: schema.schema,
      revocable: schema.revocable,
    })
    
    const uid = await tx.wait()
    uids.push(uid)
    
    logger.info(`Registered schema: ${schema.name}`, { uid })
  }
  
  return {
    providerCredentialUid: uids[0],
    visitAttestationUid: uids[1],
    reviewAttestationUid: uids[2],
    screeningAttestationUid: uids[3],
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const attestationConfig = {
  easContract: EAS_CONTRACT_ADDRESS,
  schemaRegistry: SCHEMA_REGISTRY_ADDRESS,
  rpcUrl: RPC_URL,
  explorer: EXPLORER_BASE,
  isProduction,
}
