-- Optional cleanup after verification:
-- 1) Confirm all *_enc and *_hash columns are populated.
-- 2) Update app reads to decrypt *_enc fields.
-- 3) Run the statements below to null or drop plaintext columns.

-- Users
-- UPDATE users SET email = NULL WHERE email_enc IS NOT NULL;
-- UPDATE users SET phone_number = NULL WHERE phone_number_enc IS NOT NULL;
-- ALTER TABLE users DROP COLUMN IF EXISTS email;
-- ALTER TABLE users DROP COLUMN IF EXISTS phone_number;

-- Phone numbers
-- UPDATE phone_numbers SET phone_number = NULL WHERE phone_number_enc IS NOT NULL;
-- ALTER TABLE phone_numbers DROP COLUMN IF EXISTS phone_number;

-- Call logs
-- UPDATE call_logs SET from_number = NULL WHERE from_number_enc IS NOT NULL;
-- UPDATE call_logs SET to_number = NULL WHERE to_number_enc IS NOT NULL;
-- UPDATE call_logs SET recording_url = NULL WHERE recording_url_enc IS NOT NULL;
-- UPDATE call_logs SET transcript = NULL WHERE transcript_enc IS NOT NULL;
-- UPDATE call_logs SET summary = NULL WHERE summary_enc IS NOT NULL;
-- UPDATE call_logs SET phone_number = NULL WHERE phone_number_enc IS NOT NULL;
-- UPDATE call_logs SET other_party_number = NULL WHERE other_party_number_enc IS NOT NULL;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS from_number;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS to_number;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS recording_url;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS transcript;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS summary;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS phone_number;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS other_party_number;

-- Meta CAPI configs
-- UPDATE meta_capi_configs SET access_token = NULL WHERE access_token_enc IS NOT NULL;
-- ALTER TABLE meta_capi_configs DROP COLUMN IF EXISTS access_token;

-- Payments
-- UPDATE payments SET gateway_payment_id = NULL WHERE gateway_payment_id_enc IS NOT NULL;
-- ALTER TABLE payments DROP COLUMN IF EXISTS gateway_payment_id;

-- Admin audit logs
-- UPDATE admin_audit_logs SET old_value = NULL WHERE old_value_enc IS NOT NULL;
-- UPDATE admin_audit_logs SET new_value = NULL WHERE new_value_enc IS NOT NULL;
-- ALTER TABLE admin_audit_logs DROP COLUMN IF EXISTS old_value;
-- ALTER TABLE admin_audit_logs DROP COLUMN IF EXISTS new_value;
