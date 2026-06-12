
export interface User {
  id: string
  email: string
  name: string | null
  company: string | null
  role: string
  phone_number: string | null
  created_at: string
  updated_at: string
  last_login: string | null
  password_hash: string
  is_admin?: boolean
}

export interface Team {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: string
  joined_at: string
  updated_at: string
}

export interface Pathway {
  id: string
  name: string
  description: string | null
  team_id: string | null
  creator_id: string
  updater_id: string
  created_at: string
  updated_at: string
  data: any
  phone_number: string | null
}

export interface Activity {
  id: string
  pathway_id: string
  user_id: string
  action: string
  details: any | null
  created_at: string
}

export interface Invitation {
  id: string
  email: string
  team_id: string
  role: string
  token: string
  expires_at: string
  created_at: string
  accepted: boolean
}

export interface PhoneNumber {
  id: string
  user_id: string
  phone_number: string
  pathway_id: string | null
  created_at: string
  updated_at: string
}

export interface Call {
  id: string
  call_id: string
  user_id: string
  to_number: string
  from_number: string
  duration_seconds: number | null
  status: string | null
  created_at: string
  updated_at: string
  recording_url: string | null
  transcript: string | null
  summary: string | null
  cost_cents: number | null
  pathway_id: string | null
  ended_reason: string | null
  start_time: string | null
  end_time: string | null
  queue_time: number | null
  latency_ms: number | null
  interruptions: number | null
  phone_number_id: string | null
}

export interface CallLog {
  id: string
  call_id: string
  user_id: string
  to_number: string
  from_number: string
  duration_seconds: number | null
  status: string | null
  created_at: string
  updated_at: string
  recording_url: string | null
  transcript: string | null
  summary: string | null
  pathway_id: string | null
  ended_reason: string | null
  start_time: string | null
  end_time: string | null
  queue_time: number | null
  latency_ms: number | null
  interruptions: number | null
  phone_number_id: string | null
  // Bland.ai built-in variables
  phone_number: string | null
  country: string | null
  state: string | null
  city: string | null
  zip: string | null
  short_from: string | null
  short_to: string | null
  call_timezone: string | null
  call_time_utc: string | null
  call_local_time: string | null
  transferred_to: string | null
  transferred_at: string | null
  record_enabled: boolean | null
  completed: boolean | null
  error_message: string | null
  queue_status: string | null
  pre_transfer_duration: number | null
  post_transfer_duration: number | null
  language: string | null
  placement_group: string | null
  region: string | null
  transcripts_json: unknown | null
  pathway_logs_json: unknown | null
  raw_webhook_payload: unknown | null
}

export interface LanderEvent {
  id: string
  ad_id: string | null
  ad_set_id: string | null
  campaign_id: string | null
  ad_name: string | null
  ad_set_name: string | null
  campaign_name: string | null
  placement: string | null
  site_source_name: string | null
  fbclid: string | null
  lander_url: string | null
  user_agent: string | null
  device: string | null
  ip: string | null
  os: string | null
  browser: string | null
  ip_confidence: string | null
  risk_flags: string | null
  city: string | null
  network_provider: string | null
  connection_type: string | null
  network_type: string | null
  country: string | null
  region: string | null
  isp: string | null
  asn: string | null
  click_time: string | null
  raw_webhook_payload: unknown | null
  created_at: string
}
