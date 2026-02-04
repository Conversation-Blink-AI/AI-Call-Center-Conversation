-- Add encrypted/hash columns for high/critical data

-- users: email, phone_number
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_enc TEXT,
  ADD COLUMN IF NOT EXISTS email_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_enc TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_last4 TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_phone_number_hash ON users(phone_number_hash);

-- phone_numbers: phone_number
ALTER TABLE phone_numbers
  ADD COLUMN IF NOT EXISTS phone_number_enc TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_last4 TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_numbers_phone_number_hash ON phone_numbers(phone_number_hash);

-- call_logs: from_number, to_number, recording_url, transcript, summary, phone_number (other party)
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS from_number_enc TEXT,
  ADD COLUMN IF NOT EXISTS from_number_hash TEXT,
  ADD COLUMN IF NOT EXISTS to_number_enc TEXT,
  ADD COLUMN IF NOT EXISTS to_number_hash TEXT,
  ADD COLUMN IF NOT EXISTS recording_url_enc TEXT,
  ADD COLUMN IF NOT EXISTS transcript_enc TEXT,
  ADD COLUMN IF NOT EXISTS summary_enc TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_enc TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_hash TEXT,
  ADD COLUMN IF NOT EXISTS other_party_number_enc TEXT,
  ADD COLUMN IF NOT EXISTS other_party_number_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_call_logs_from_number_hash ON call_logs(from_number_hash);
CREATE INDEX IF NOT EXISTS idx_call_logs_to_number_hash ON call_logs(to_number_hash);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone_number_hash ON call_logs(phone_number_hash);
CREATE INDEX IF NOT EXISTS idx_call_logs_other_party_number_hash ON call_logs(other_party_number_hash);

-- meta_capi_configs: access_token
ALTER TABLE meta_capi_configs
  ADD COLUMN IF NOT EXISTS access_token_enc TEXT;

-- payments: gateway_payment_id
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS gateway_payment_id_enc TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id_enc ON payments(gateway_payment_id_enc);

-- admin_audit_logs: old_value, new_value (JSON)
ALTER TABLE admin_audit_logs
  ADD COLUMN IF NOT EXISTS old_value_enc TEXT,
  ADD COLUMN IF NOT EXISTS new_value_enc TEXT;
