export function mapHustleSignInError(error: unknown): { status: number; message: string } {
  if (error instanceof Error) {
    const msg = error.message

    if (msg.includes("DATA_ENCRYPTION_KEY") || msg.includes("DATA_HASH_KEY")) {
      return {
        status: 500,
        message: "Server encryption configuration is missing or invalid. Contact support.",
      }
    }

    if (msg.includes("DATABASE_URL")) {
      return {
        status: 500,
        message: "Database configuration is missing. Contact support.",
      }
    }

    if (msg.includes("password_hash") && msg.includes("not-null")) {
      return {
        status: 500,
        message:
          "Database migration required: password_hash must allow NULL for SSO users. Run scripts/allow-null-password-hash.sql",
      }
    }

    if (msg.includes("email_enc") || msg.includes("email_hash") || msg.includes("column")) {
      return {
        status: 500,
        message: "Database schema is out of date. Run scripts/add-encryption-columns.sql on production.",
      }
    }
  }

  const pgError = error as { code?: string; constraint?: string; column?: string; detail?: string }

  if (pgError.code === "23502") {
    const column = pgError.column || "unknown"
    if (column === "password_hash") {
      return {
        status: 500,
        message:
          "Database migration required: password_hash must allow NULL for SSO users. Run scripts/allow-null-password-hash.sql",
      }
    }
    return {
      status: 500,
      message: `Database constraint error: required field "${column}" is missing.`,
    }
  }

  if (pgError.code === "23505") {
    return {
      status: 409,
      message: "An account with this email already exists. Please contact support.",
    }
  }

  if (pgError.code === "ECONNREFUSED" || pgError.code === "ENOTFOUND") {
    return {
      status: 503,
      message: "Unable to connect to the database. Please try again later.",
    }
  }

  return {
    status: 500,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Internal server error",
  }
}

export function assertHustleSignInEnv(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
  }

  if (!process.env.DATA_ENCRYPTION_KEY) {
    throw new Error("DATA_ENCRYPTION_KEY is not set")
  }

  if (!process.env.DATA_HASH_KEY) {
    throw new Error("DATA_HASH_KEY is not set")
  }
}
