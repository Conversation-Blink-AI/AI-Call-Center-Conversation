import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes an email address to lowercase for consistent storage and comparison.
 * This prevents duplicate accounts from being created due to case differences.
 * 
 * @param email - The email address to normalize
 * @returns The email address in lowercase
 */
export function normalizeEmail(email: string): string {
  if (!email) return email
  return email.trim().toLowerCase()
}
