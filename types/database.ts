
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
  bland_id: string | null
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
  phone_number: string | null // The other party's number (always the other party)
  country: string | null // Country code (e.g., US)
  state: string | null // State/province abbreviation (e.g., CA)
  city: string | null // Full city name, capitalized
  zip: string | null // Zip code
  short_from: string | null // Outbound number with country code removed
  short_to: string | null // Inbound number with country code removed
  call_timezone: string | null // {{now}} - Current time in call's timezone
  call_time_utc: string | null // {{now_utc}} - Current time in UTC
}
