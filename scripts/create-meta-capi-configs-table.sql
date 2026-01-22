create table if not exists meta_capi_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  nickname text not null,
  pixel_id text not null,
  access_token text not null,
  event_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists meta_capi_configs_user_id_idx
  on meta_capi_configs(user_id);
