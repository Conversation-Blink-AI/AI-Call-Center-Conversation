import crypto from "crypto"
import { normalizeEmail } from "./utils"
import { toE164Format } from "@/utils/phone-utils"

const DEFAULT_KEY_ID = "v1"

type ParsedCiphertext = {
  keyId: string
  iv: Buffer
  tag: Buffer
  ciphertext: Buffer
}

function getKeyId(): string {
  return process.env.DATA_ENCRYPTION_KEY_ID?.trim() || DEFAULT_KEY_ID
}

function getEncryptionKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("DATA_ENCRYPTION_KEY is not set")
  }
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes (base64)")
  }
  return key
}

function getHashKey(): Buffer {
  const raw = process.env.DATA_HASH_KEY
  if (!raw) {
    throw new Error("DATA_HASH_KEY is not set")
  }
  const key = Buffer.from(raw, "base64")
  if (key.length < 32) {
    throw new Error("DATA_HASH_KEY must be at least 32 bytes (base64)")
  }
  return key
}

function parseCiphertext(payload: string): ParsedCiphertext {
  const [keyId, ivB64, tagB64, dataB64] = payload.split(":")
  if (!keyId || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid ciphertext format")
  }
  return {
    keyId,
    iv: Buffer.from(ivB64, "base64"),
    tag: Buffer.from(tagB64, "base64"),
    ciphertext: Buffer.from(dataB64, "base64")
  }
}

export function encryptString(plaintext: string): string {
  if (!plaintext) return ""
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  const keyId = getKeyId()
  return [
    keyId,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64")
  ].join(":")
}

export function decryptString(payload: string): string {
  if (!payload) return ""
  const parsed = parseCiphertext(payload)
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, parsed.iv)
  decipher.setAuthTag(parsed.tag)
  const plaintext = Buffer.concat([decipher.update(parsed.ciphertext), decipher.final()])
  return plaintext.toString("utf8")
}

export function hashValue(value: string): string {
  if (!value) return ""
  const key = getHashKey()
  return crypto.createHmac("sha256", key).update(value, "utf8").digest("hex")
}

export function hashEmail(email: string): string {
  if (!email) return ""
  return hashValue(normalizeEmail(email))
}

export function hashPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return ""
  return hashValue(toE164Format(phoneNumber))
}

export function phoneLast4(phoneNumber: string): string {
  if (!phoneNumber) return ""
  const digits = phoneNumber.replace(/\D/g, "")
  return digits.slice(-4)
}
