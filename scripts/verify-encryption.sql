-- Verification checks for encrypted fields

-- Users
SELECT COUNT(*) AS users_missing_email_enc
FROM users
WHERE email IS NOT NULL AND (email_enc IS NULL OR email_hash IS NULL);

SELECT COUNT(*) AS users_missing_phone_enc
FROM users
WHERE phone_number IS NOT NULL AND (phone_number_enc IS NULL OR phone_number_hash IS NULL OR phone_number_last4 IS NULL);

-- Phone numbers
SELECT COUNT(*) AS phone_numbers_missing_enc
FROM phone_numbers
WHERE phone_number IS NOT NULL AND (phone_number_enc IS NULL OR phone_number_hash IS NULL OR phone_number_last4 IS NULL);

-- Call logs
SELECT COUNT(*) AS call_logs_missing_number_enc
FROM call_logs
WHERE (from_number IS NOT NULL AND (from_number_enc IS NULL OR from_number_hash IS NULL))
   OR (to_number IS NOT NULL AND (to_number_enc IS NULL OR to_number_hash IS NULL))
   OR (phone_number IS NOT NULL AND (phone_number_enc IS NULL OR phone_number_hash IS NULL))
   OR (other_party_number IS NOT NULL AND (other_party_number_enc IS NULL OR other_party_number_hash IS NULL));

SELECT COUNT(*) AS call_logs_missing_text_enc
FROM call_logs
WHERE (recording_url IS NOT NULL AND recording_url_enc IS NULL)
   OR (transcript IS NOT NULL AND transcript_enc IS NULL)
   OR (summary IS NOT NULL AND summary_enc IS NULL);

-- Meta CAPI configs
SELECT COUNT(*) AS meta_configs_missing_enc
FROM meta_capi_configs
WHERE access_token IS NOT NULL AND access_token_enc IS NULL;

-- Payments
SELECT COUNT(*) AS payments_missing_enc
FROM payments
WHERE gateway_payment_id IS NOT NULL AND gateway_payment_id_enc IS NULL;

-- Admin audit logs
SELECT COUNT(*) AS admin_audit_logs_missing_enc
FROM admin_audit_logs
WHERE (old_value IS NOT NULL AND old_value_enc IS NULL)
   OR (new_value IS NOT NULL AND new_value_enc IS NULL);
