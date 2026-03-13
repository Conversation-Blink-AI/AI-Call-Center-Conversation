create table if not exists meta_capi_events (
  id uuid primary key default gen_random_uuid(),
  call_id text not null,
  config_id uuid not null references meta_capi_configs(id) on delete cascade,
  event_name text not null,
  request_payload jsonb not null,
  response_payload jsonb,
  response_status integer,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists meta_capi_events_call_id_idx
  on meta_capi_events(call_id);

create index if not exists meta_capi_events_config_id_idx
  on meta_capi_events(config_id);
