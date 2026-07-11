"use client"

import { Keypair } from "@stellar/stellar-sdk"

function walletKey(userId?: string | null): string {
  return userId ? `stellar_wallet_${userId}` : "stellar_wallet"
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function deriveKey(pincode: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pincode),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export interface StoredWallet {
  publicKey: string
  encrypted: string
}

export interface WalletAccount {
  publicKey: string
  secretKey: string
}

export function generateWallet(): { publicKey: string; secretKey: string } {
  const kp = Keypair.random()
  return { publicKey: kp.publicKey(), secretKey: kp.secret() }
}

export async function encryptSecret(secretKey: string, pincode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(pincode, salt)
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(secretKey)
  )
  const payload = JSON.stringify({
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(ciphertext),
  })
  return payload
}

export async function decryptSecret(encryptedPayload: string, pincode: string): Promise<string> {
  const { salt: saltB64, iv: ivB64, data: dataB64 } = JSON.parse(encryptedPayload)
  const salt = new Uint8Array(base64ToArrayBuffer(saltB64))
  const iv = new Uint8Array(base64ToArrayBuffer(ivB64))
  const data = base64ToArrayBuffer(dataB64)
  const key = await deriveKey(pincode, salt)
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data)
  return new TextDecoder().decode(decrypted)
}

export function saveWallet(publicKey: string, encryptedPayload: string, userId?: string | null): void {
  if (typeof window === "undefined") return
  localStorage.setItem(walletKey(userId), JSON.stringify({ publicKey, encrypted: encryptedPayload }))
}

export function getStoredWallet(userId?: string | null): StoredWallet | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(walletKey(userId))
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearWallet(userId?: string | null): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(walletKey(userId))
}

export function hasWallet(userId?: string | null): boolean {
  return getStoredWallet(userId) !== null
}

export async function unlockWallet(pincode: string, userId?: string | null): Promise<WalletAccount> {
  const stored = getStoredWallet(userId)
  if (!stored) throw new Error("No wallet found")
  const secretKey = await decryptSecret(stored.encrypted, pincode)
  return { publicKey: stored.publicKey, secretKey }
}

export async function createAndStoreWallet(pincode: string, userId?: string | null): Promise<WalletAccount> {
  if (hasWallet(userId)) {
    throw new Error("A wallet already exists.")
  }
  const { publicKey, secretKey } = generateWallet()
  const encrypted = await encryptSecret(secretKey, pincode)
  saveWallet(publicKey, encrypted, userId)
  return { publicKey, secretKey }
}

/**
 * Import a raw Stellar secret key (S...) and encrypt it with the given
 * pincode. Throws if the secret is invalid or a wallet already exists.
 */
export async function importAndStoreWallet(
  secretKey: string,
  pincode: string,
  userId?: string | null,
): Promise<WalletAccount> {
  const trimmed = secretKey.trim()
  if (!trimmed.startsWith("S") || trimmed.length < 50) {
    throw new Error("That doesn't look like a Stellar secret key (should start with 'S').")
  }
  let kp: Keypair
  try {
    kp = Keypair.fromSecret(trimmed)
  } catch (e) {
    throw new Error("Invalid Stellar secret key — wrong format or checksum.")
  }
  if (hasWallet(userId)) {
    throw new Error(
      "A wallet already exists in this browser. Use Export first if you want to replace it.",
    )
  }
  const publicKey = kp.publicKey()
  const encrypted = await encryptSecret(trimmed, pincode)
  saveWallet(publicKey, encrypted, userId)
  return { publicKey, secretKey: trimmed }
}

export function getPublicKey(userId?: string | null): string | null {
  const stored = getStoredWallet(userId)
  return stored?.publicKey ?? null
}
