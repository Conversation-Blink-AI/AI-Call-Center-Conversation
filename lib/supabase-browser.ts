// This file provides compatibility for components that still reference Supabase
// but we're now using Replit DB for authentication

export interface Database {
  // Stub interface for compatibility
}

// Stub function that throws an error if accidentally used
export function useSupabaseBrowser() {
  throw new Error("Supabase browser client is disabled. Use Replit DB authentication instead.")
}

// Also export the client getter for non-hook usage
export function getSupabaseBrowser() {
  throw new Error("Supabase browser client is disabled. Use Replit DB authentication instead.")
}