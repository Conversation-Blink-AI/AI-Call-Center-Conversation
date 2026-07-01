export interface LanderEventPayload {
  ad_id?: string | null
  ad_set_id?: string | null
  campaign_id?: string | null
  ad_name?: string | null
  ad_set_name?: string | null
  campaign_name?: string | null
  placement?: string | null
  site_source_name?: string | null
  fbclid?: string | null
  lander_url?: string | null
  user_agent?: string | null
  device?: string | null
  ip?: string | null
  os?: string | null
  browser?: string | null
  ip_confidence?: string | null
  risk_flags?: string | null
  city?: string | null
  network_provider?: string | null
  connection_type?: string | null
  network_type?: string | null
  country?: string | null
  region?: string | null
  isp?: string | null
  asn?: string | null
  click_time?: string | Date | null
  raw_webhook_payload?: Record<string, unknown> | null
}

function pickString(body: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = body[key]
    if (value === undefined || value === null || value === "") continue
    return String(value)
  }
  return null
}

function pickRiskFlags(body: Record<string, unknown>): string | null {
  const value = body.risk_flags ?? body.riskFlags
  if (value === undefined || value === null || value === "") return null
  if (Array.isArray(value)) return value.map(String).join(", ")
  return String(value)
}

function pickClickTime(body: Record<string, unknown>): string | null {
  const value = body.click_time ?? body.clickTime
  if (value === undefined || value === null || value === "") return null
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function mapLanderWebhookToEvent(body: Record<string, unknown>): LanderEventPayload {
  return {
    ad_id: pickString(body, "ad_id", "adId", "Ad ID"),
    ad_set_id: pickString(body, "ad_set_id", "adSetId", "Ad Set ID"),
    campaign_id: pickString(body, "campaign_id", "campaignId", "Campaign ID"),
    ad_name: pickString(body, "ad_name", "adName", "Ad Name"),
    ad_set_name: pickString(body, "ad_set_name", "adSetName", "Ad Set Name"),
    campaign_name: pickString(body, "campaign_name", "campaignName", "Campaign Name"),
    placement: pickString(body, "placement", "Placement"),
    site_source_name: pickString(body, "site_source_name", "siteSourceName", "Site Source Name"),
    fbclid: pickString(body, "fbclid", "FBCLID"),
    lander_url: pickString(body, "lander_url", "landerUrl", "Lander URL"),
    user_agent: pickString(body, "user_agent", "userAgent", "User Agent"),
    device: pickString(body, "device", "Device"),
    ip: pickString(body, "ip", "IP"),
    os: pickString(body, "os", "OS"),
    browser: pickString(body, "browser", "Browser"),
    ip_confidence: pickString(body, "ip_confidence", "ipConfidence", "IP Confidence"),
    risk_flags: pickRiskFlags(body),
    city: pickString(body, "city", "City (IP-based)", "City"),
    network_provider: pickString(body, "network_provider", "networkProvider", "Network Provider"),
    connection_type: pickString(body, "connection_type", "connectionType", "Connection Type"),
    network_type: pickString(body, "network_type", "networkType", "Network type", "Network Type"),
    country: pickString(body, "country", "Country"),
    region: pickString(body, "region", "Region"),
    isp: pickString(body, "isp", "ISP"),
    asn: pickString(body, "asn", "ASN"),
    click_time: pickClickTime(body),
    raw_webhook_payload: body,
  }
}
