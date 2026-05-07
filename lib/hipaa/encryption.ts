/**
 * HIPAA-Compliant Field-Level Encryption
 * 
 * Provides AES-256-GCM encryption for sensitive PHI fields.
 * This ensures data is encrypted at rest even if the database is compromised.
 * 
 * IMPORTANT: 
 * - Store HIPAA_ENCRYPTION_KEY securely (use secrets manager in production)
 * - Implement key rotation procedures
 * - Never log or expose encryption keys
 * 
 * @module hipaa/encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // AES block size
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32
const KEY_LENGTH = 32 // 256 bits

/**
 * Get the encryption key from environment
 * In production, use a secrets manager
 */
function getEncryptionKey(): Buffer {
  const key = process.env.HIPAA_ENCRYPTION_KEY
  
  if (!key) {
    throw new Error(
      'HIPAA_ENCRYPTION_KEY environment variable is required for PHI encryption. ' +
      'Generate a secure key with: openssl rand -base64 32'
    )
  }
  
  // Derive a proper key from the password using scrypt
  const salt = process.env.HIPAA_ENCRYPTION_SALT || 'basehealth-hipaa-salt-v1'
  return scryptSync(key, salt, KEY_LENGTH)
}

/**
 * Encrypt a string value using AES-256-GCM
 * Returns a base64-encoded string containing IV + ciphertext + auth tag
 * 
 * @param plaintext - The value to encrypt
 * @returns Encrypted value as base64 string
 */
export function encryptPHI(plaintext: string): string {
  if (!plaintext) return plaintext
  
  try {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)
    
    const cipher = createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    
    const authTag = cipher.getAuthTag()
    
    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'base64'),
      authTag,
    ])
    
    // Prefix with 'enc:' to identify encrypted values
    return 'enc:' + combined.toString('base64')
  } catch (error) {
    console.error('PHI encryption failed:', error)
    throw new Error('Failed to encrypt PHI data')
  }
}

/**
 * Decrypt an encrypted value
 * 
 * @param encryptedValue - The encrypted value (base64 string with 'enc:' prefix)
 * @returns Decrypted plaintext
 */
export function decryptPHI(encryptedValue: string): string {
  if (!encryptedValue) return encryptedValue
  
  // Check if value is encrypted
  if (!encryptedValue.startsWith('enc:')) {
    // Return as-is if not encrypted (for backward compatibility)
    return encryptedValue
  }
  
  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedValue.slice(4), 'base64')
    
    // Extract IV, ciphertext, and auth tag
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
    const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH)
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(ciphertext)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    
    return decrypted.toString('utf8')
  } catch (error) {
    console.error('PHI decryption failed:', error)
    throw new Error('Failed to decrypt PHI data')
  }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith('enc:')
}

/**
 * Encrypt an object's PHI fields
 * 
 * @param obj - Object containing PHI fields
 * @param phiFields - Array of field names to encrypt
 * @returns New object with encrypted PHI fields
 */
export function encryptPHIFields<T extends Record<string, any>>(
  obj: T,
  phiFields: string[]
): T {
  const result: Record<string, any> = { ...obj }
  
  for (const field of phiFields) {
    if (field in result && typeof result[field] === 'string' && result[field]) {
      result[field] = encryptPHI(result[field])
    }
  }
  
  return result as T
}

/**
 * Decrypt an object's PHI fields
 * 
 * @param obj - Object containing encrypted PHI fields
 * @param phiFields - Array of field names to decrypt
 * @returns New object with decrypted PHI fields
 */
export function decryptPHIFields<T extends Record<string, any>>(
  obj: T,
  phiFields: string[]
): T {
  const result: Record<string, any> = { ...obj }
  
  for (const field of phiFields) {
    if (field in result && typeof result[field] === 'string' && isEncrypted(result[field])) {
      result[field] = decryptPHI(result[field])
    }
  }
  
  return result as T
}

/**
 * Hash a value for searching encrypted fields
 * Use this when you need to search for a specific value without decrypting all records
 * 
 * Note: This creates a deterministic hash, which has privacy trade-offs.
 * Only use for fields that require exact-match searching.
 * 
 * @param value - The value to hash
 * @returns Hashed value as hex string
 */
export function hashForSearch(value: string): string {
  if (!value) return ''
  
  const salt = process.env.HIPAA_SEARCH_SALT || 'basehealth-search-salt-v1'
  const hash = scryptSync(value.toLowerCase().trim(), salt, 32)
  return hash.toString('hex')
}

/**
 * Mask a PHI value for display (show only last 4 characters)
 * 
 * @param value - The value to mask
 * @param visibleChars - Number of characters to show at the end
 * @returns Masked value
 */
export function maskPHI(value: string, visibleChars = 4): string {
  if (!value || value.length <= visibleChars) {
    return '****'
  }
  
  // Decrypt if encrypted
  const plaintext = isEncrypted(value) ? decryptPHI(value) : value
  
  const masked = '*'.repeat(plaintext.length - visibleChars)
  const visible = plaintext.slice(-visibleChars)
  
  return masked + visible
}

/**
 * Mask specific PHI types appropriately
 */
export function maskSSN(ssn: string): string {
  const plain = isEncrypted(ssn) ? decryptPHI(ssn) : ssn
  // Show only last 4 digits: ***-**-1234
  return `***-**-${plain.slice(-4)}`
}

export function maskPhone(phone: string): string {
  const plain = isEncrypted(phone) ? decryptPHI(phone) : phone
  // Show only last 4 digits: (***) ***-1234
  const digits = plain.replace(/\D/g, '')
  return `(***) ***-${digits.slice(-4)}`
}

export function maskEmail(email: string): string {
  const plain = isEncrypted(email) ? decryptPHI(email) : email
  const [local, domain] = plain.split('@')
  if (!domain) return '****@****'
  
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '**'
  
  return `${maskedLocal}@${domain}`
}

export function maskDOB(dob: string | Date): string {
  // Show only year: **/**/1990
  const date = typeof dob === 'string' ? new Date(dob) : dob
  const year = date.getFullYear()
  return `**/**/${year}`
}

/**
 * Generate a secure encryption key for HIPAA_ENCRYPTION_KEY
 * Run this once and store the result securely
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('base64')
}
