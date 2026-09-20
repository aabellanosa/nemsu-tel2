begin;

create table if not exists roles (
  id bigserial primary key,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id bigserial primary key,
  display_name text not null,
  username text not null unique,
  role_id bigint not null references roles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_dates (
  id bigserial primary key,
  business_date date not null unique,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists shift_sessions (
  id bigserial primary key,
  user_id bigint not null references users(id),
  business_date_id bigint references business_dates(id),
  shift_name text not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  handover_notes text
);

alter table shift_sessions add column if not exists last_activity_at timestamptz;
update shift_sessions set last_activity_at = started_at where last_activity_at is null;
alter table shift_sessions alter column last_activity_at set default now();
alter table shift_sessions alter column last_activity_at set not null;

create table if not exists rooms (
  id bigserial primary key,
  room_number text not null unique,
  room_type text not null,
  occupancy_status text not null default 'vacant' check (occupancy_status in ('vacant', 'assigned', 'occupied')),
  housekeeping_status text not null default 'clean' check (housekeeping_status in ('clean', 'dirty', 'inspected', 'pickup')),
  maintenance_status text not null default 'in_service' check (maintenance_status in ('in_service', 'out_of_service', 'out_of_order')),
  current_guest_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists room_status_history (
  id bigserial primary key,
  room_id bigint not null references rooms(id),
  previous_occupancy_status text,
  new_occupancy_status text,
  previous_housekeeping_status text,
  new_housekeeping_status text,
  previous_maintenance_status text,
  new_maintenance_status text,
  reason text,
  performed_by bigint references users(id),
  shift_session_id bigint references shift_sessions(id),
  created_at timestamptz not null default now()
);

create table if not exists guest_profiles (
  id bigserial primary key,
  first_name text not null,
  last_name text not null,
  nationality text,
  phone text,
  email text,
  vip boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists guest_identifications (
  id bigserial primary key,
  guest_profile_id bigint not null references guest_profiles(id) on delete cascade,
  id_type text not null,
  id_number text not null,
  created_at timestamptz not null default now(),
  unique (guest_profile_id, id_type, id_number)
);

create table if not exists reservations (
  id bigserial primary key,
  confirmation_number text not null unique,
  guest_profile_id bigint not null references guest_profiles(id),
  status text not null default 'reserved' check (status in ('reserved', 'due_in', 'checked_in', 'cancelled', 'no_show', 'checked_out')),
  arrival_date date not null,
  departure_date date not null,
  eta text,
  requested_room_type text not null,
  assigned_room_id bigint references rooms(id),
  adults integer not null default 1 check (adults >= 1),
  children integer not null default 0 check (children >= 0),
  rate_plan text not null,
  nightly_rate numeric(12, 2) not null default 0 check (nightly_rate >= 0),
  payment_method text not null,
  notes text,
  created_by bigint references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (departure_date > arrival_date)
);

create table if not exists stays (
  id bigserial primary key,
  reservation_id bigint references reservations(id),
  guest_profile_id bigint not null references guest_profiles(id),
  room_id bigint not null references rooms(id),
  status text not null default 'in_house' check (status in ('in_house', 'checked_out')),
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  departure_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists folios (
  id bigserial primary key,
  stay_id bigint not null references stays(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'settled', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_categories (
  id bigserial primary key,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists folio_transactions (
  id bigserial primary key,
  folio_id bigint not null references folios(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('room_charge', 'service_charge', 'payment', 'room_move', 'adjustment')),
  source text not null default 'front_desk',
  service_category_id bigint references service_categories(id),
  description text not null,
  amount numeric(12, 2) not null,
  reference text not null,
  notes text,
  performed_by bigint references users(id),
  shift_session_id bigint references shift_sessions(id),
  created_at timestamptz not null default now()
);

create table if not exists card_payment_methods (
  id bigserial primary key,
  guest_profile_id bigint references guest_profiles(id),
  reservation_id bigint references reservations(id),
  stay_id bigint references stays(id),
  brand text not null,
  masked_number text not null,
  cardholder_name text not null,
  expiry_month text not null,
  expiry_year text not null,
  token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists card_authorizations (
  id bigserial primary key,
  payment_method_id bigint not null references card_payment_methods(id),
  reservation_id bigint references reservations(id),
  stay_id bigint references stays(id),
  authorization_code text not null unique,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'authorized' check (status in ('authorized', 'captured', 'voided', 'declined')),
  authorized_at timestamptz not null default now(),
  captured_at timestamptz,
  performed_by bigint references users(id),
  shift_session_id bigint references shift_sessions(id)
);

create table if not exists audit_events (
  id bigserial primary key,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  previous_value jsonb,
  new_value jsonb,
  performed_by bigint references users(id),
  shift_session_id bigint references shift_sessions(id),
  business_date_id bigint references business_dates(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_reservations_status_arrival on reservations(status, arrival_date);
create index if not exists idx_stays_status_room on stays(status, room_id);
create index if not exists idx_folio_transactions_folio on folio_transactions(folio_id, created_at);
create index if not exists idx_audit_events_created on audit_events(created_at);
create unique index if not exists idx_shift_sessions_one_active_user on shift_sessions(user_id) where status = 'active';

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at before update on users for each row execute function set_updated_at();

drop trigger if exists rooms_set_updated_at on rooms;
create trigger rooms_set_updated_at before update on rooms for each row execute function set_updated_at();

drop trigger if exists guest_profiles_set_updated_at on guest_profiles;
create trigger guest_profiles_set_updated_at before update on guest_profiles for each row execute function set_updated_at();

drop trigger if exists reservations_set_updated_at on reservations;
create trigger reservations_set_updated_at before update on reservations for each row execute function set_updated_at();

drop trigger if exists stays_set_updated_at on stays;
create trigger stays_set_updated_at before update on stays for each row execute function set_updated_at();

drop trigger if exists folios_set_updated_at on folios;
create trigger folios_set_updated_at before update on folios for each row execute function set_updated_at();

commit;
