-- Lander tracking events: ad metadata + visitor/device/IP data from landing pages

CREATE TABLE IF NOT EXISTS lander_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Meta / ad attribution
    ad_id VARCHAR(255),
    ad_set_id VARCHAR(255),
    campaign_id VARCHAR(255),
    ad_name VARCHAR(500),
    ad_set_name VARCHAR(500),
    campaign_name VARCHAR(500),
    placement VARCHAR(255),
    site_source_name VARCHAR(255),
    fbclid VARCHAR(500),
    lander_url TEXT,

    -- Visitor / device / network
    user_agent TEXT,
    device VARCHAR(100),
    ip VARCHAR(45),
    os VARCHAR(100),
    browser VARCHAR(100),
    ip_confidence VARCHAR(50),
    risk_flags TEXT,
    city VARCHAR(255),
    network_provider VARCHAR(255),
    connection_type VARCHAR(100),
    network_type VARCHAR(100),
    country VARCHAR(100),
    region VARCHAR(255),
    isp VARCHAR(255),
    asn VARCHAR(50),
    click_time TIMESTAMPTZ,

    raw_webhook_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lander_events_created_at ON lander_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lander_events_campaign_id ON lander_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lander_events_ad_id ON lander_events(ad_id);
CREATE INDEX IF NOT EXISTS idx_lander_events_fbclid ON lander_events(fbclid);
CREATE INDEX IF NOT EXISTS idx_lander_events_click_time ON lander_events(click_time DESC);
CREATE INDEX IF NOT EXISTS idx_lander_events_ip ON lander_events(ip);
