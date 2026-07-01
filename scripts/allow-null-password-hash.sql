-- Hustle/Forex SSO users are created without a local password.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
