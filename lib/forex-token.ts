export function decodeJwtPayload(token?: string | null): Record<string, unknown> | null {
  if (!token) return null

  try {
    const payload = token.split(".")[1]
    if (!payload) return null

    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"))
  } catch {
    return null
  }
}

export function mergeDefined(
  ...sources: Array<Record<string, unknown> | null | undefined>
): Record<string, unknown> {
  return sources.reduce<Record<string, unknown>>((merged, source) => {
    if (!source) return merged

    Object.entries(source).forEach(([key, value]) => {
      if (value !== undefined) {
        merged[key] = value
      }
    })

    return merged
  }, {})
}
