begin;

insert into roles (name, description) values
  ('Front Desk Agent', 'Reception user with arrivals, reservations, room rack, departures, and services access.'),
  ('Front Desk Supervisor', 'Supervisor with all operational modules and override-oriented permissions.'),
  ('Cashier', 'Cashiering user for folios, payments, services, and departures.'),
  ('Housekeeping Supervisor', 'Housekeeping user for room rack and room readiness updates.'),
  ('Night Auditor', 'Night audit user for cashiering, reports, departures, and business-date review.')
on conflict (name) do update set description = excluded.description;

insert into users (display_name, username, role_id) values
  ('A. Santos', 'asantos', (select id from roles where name = 'Front Desk Agent')),
  ('J. Lim', 'jlim', (select id from roles where name = 'Front Desk Supervisor')),
  ('Carla Mendoza', 'cmendoza', (select id from roles where name = 'Cashier')),
  ('Rosa Villarin', 'rvillarin', (select id from roles where name = 'Housekeeping Supervisor')),
  ('N. Garcia', 'ngarcia', (select id from roles where name = 'Night Auditor'))
on conflict (username) do update set
  display_name = excluded.display_name,
  role_id = excluded.role_id,
  is_active = true;

insert into business_dates (business_date, status)
values ((now() at time zone 'Asia/Manila')::date, 'open')
on conflict (business_date) do nothing;

insert into service_categories (name) values
  ('Restaurant'),
  ('Room Service'),
  ('Minibar'),
  ('Laundry'),
  ('Spa'),
  ('Transportation'),
  ('Business Center'),
  ('Additional Bed'),
  ('Miscellaneous')
on conflict (name) do update set is_active = true;

insert into rooms (room_number, room_type, occupancy_status, housekeeping_status, maintenance_status, current_guest_name) values
  ('201', 'STD', 'vacant', 'clean', 'in_service', null),
  ('202', 'STD', 'occupied', 'clean', 'in_service', 'Ana Romero'),
  ('203', 'DLX', 'vacant', 'inspected', 'in_service', null),
  ('204', 'DLX', 'vacant', 'dirty', 'in_service', null),
  ('205', 'STD', 'vacant', 'clean', 'in_service', null),
  ('301', 'STD', 'occupied', 'clean', 'in_service', 'Jose Rivera'),
  ('302', 'DLX', 'vacant', 'clean', 'in_service', null),
  ('303', 'DLX', 'occupied', 'clean', 'in_service', 'Linda Park'),
  ('304', 'STE', 'vacant', 'clean', 'out_of_order', null),
  ('305', 'STD', 'occupied', 'clean', 'in_service', 'Daniel Reyes'),
  ('318', 'DLX', 'assigned', 'clean', 'in_service', 'Robert Delgado'),
  ('401', 'DLX', 'occupied', 'clean', 'in_service', 'Ramon Cruz'),
  ('402', 'STE', 'assigned', 'inspected', 'in_service', 'Alicia Fernandez'),
  ('403', 'DLX', 'vacant', 'dirty', 'in_service', null),
  ('404', 'STE', 'vacant', 'clean', 'in_service', null)
on conflict (room_number) do update set
  room_type = excluded.room_type,
  occupancy_status = excluded.occupancy_status,
  housekeeping_status = excluded.housekeeping_status,
  maintenance_status = excluded.maintenance_status,
  current_guest_name = excluded.current_guest_name;

with guest as (
  insert into guest_profiles (first_name, last_name, nationality, phone, email, vip, notes)
  select 'Alicia', 'Fernandez', 'Filipino', '+63 917 555 0131', 'alicia@example.com', true, 'High floor preferred.'
  where not exists (select 1 from reservations where confirmation_number = 'GH-28491')
  returning id
),
identification as (
  insert into guest_identifications (guest_profile_id, id_type, id_number)
  select id, 'Passport', 'P1234567' from guest
)
insert into reservations
  (confirmation_number, guest_profile_id, status, arrival_date, departure_date, eta, requested_room_type, assigned_room_id, adults, children, rate_plan, nightly_rate, payment_method, notes)
select 'GH-28491', guest.id, 'due_in', (now() at time zone 'Asia/Manila')::date, (now() at time zone 'Asia/Manila')::date + interval '2 days', '12:30 PM', 'Executive Suite', rooms.id, 2, 0, 'BAR', 7200, 'Credit Card Guarantee', 'High floor preferred.'
from guest
join rooms on rooms.room_number = '402';

with guest as (
  insert into guest_profiles (first_name, last_name, nationality, phone, email, vip, notes)
  select 'Robert', 'Delgado', 'American', '+63 917 555 0132', null, false, null
  where not exists (select 1 from reservations where confirmation_number = 'GH-28506')
  returning id
),
identification as (
  insert into guest_identifications (guest_profile_id, id_type, id_number)
  select id, 'Driver''s License', 'N01-23-456789' from guest
)
insert into reservations
  (confirmation_number, guest_profile_id, status, arrival_date, departure_date, eta, requested_room_type, assigned_room_id, adults, children, rate_plan, nightly_rate, payment_method, notes)
select 'GH-28506', guest.id, 'due_in', (now() at time zone 'Asia/Manila')::date, (now() at time zone 'Asia/Manila')::date + interval '1 day', '2:00 PM', 'Deluxe King', rooms.id, 1, 0, 'CORP', 4800, 'Direct Bill', null
from guest
join rooms on rooms.room_number = '318';

with guest as (
  insert into guest_profiles (first_name, last_name, nationality, phone, email, vip, notes)
  select 'Maria', 'Velasco', 'Filipino', '+63 917 555 0133', 'maria@example.com', true, 'Late checkout requested.'
  where not exists (select 1 from reservations where confirmation_number = 'GH-28524')
  returning id
),
identification as (
  insert into guest_identifications (guest_profile_id, id_type, id_number)
  select id, 'National ID', '1234-5678-9012' from guest
)
insert into reservations
  (confirmation_number, guest_profile_id, status, arrival_date, departure_date, eta, requested_room_type, adults, children, rate_plan, nightly_rate, payment_method, notes)
select 'GH-28524', id, 'due_in', (now() at time zone 'Asia/Manila')::date, (now() at time zone 'Asia/Manila')::date + interval '3 days', '3:15 PM', 'Deluxe Twin', 2, 1, 'BAR', 5250, 'Pay at Hostel', 'Late checkout requested.'
from guest;

with guest as (
  insert into guest_profiles (first_name, last_name, nationality, phone, email, vip, notes)
  select 'James', 'Wu', 'Singaporean', null, null, false, null
  where not exists (select 1 from reservations where confirmation_number = 'GH-28538')
  returning id
),
identification as (
  insert into guest_identifications (guest_profile_id, id_type, id_number)
  select id, 'Passport', 'E7654321' from guest
)
insert into reservations
  (confirmation_number, guest_profile_id, status, arrival_date, departure_date, eta, requested_room_type, adults, children, rate_plan, nightly_rate, payment_method, notes)
select 'GH-28538', id, 'due_in', (now() at time zone 'Asia/Manila')::date, (now() at time zone 'Asia/Manila')::date + interval '1 day', '5:30 PM', 'Standard Queen', 1, 0, 'BAR', 3900, 'Cash Deposit', null
from guest;

with arrival_refresh(confirmation_number, departure_offset, eta, requested_room_type, assigned_room_number, adults, children, rate_plan, nightly_rate, payment_method, notes) as (
  values
    ('GH-28491', 2, '12:30 PM', 'Executive Suite', '402', 2, 0, 'BAR', 7200::numeric, 'Credit Card Guarantee', 'High floor preferred.'),
    ('GH-28506', 1, '2:00 PM', 'Deluxe King', '318', 1, 0, 'CORP', 4800::numeric, 'Direct Bill', null),
    ('GH-28524', 3, '3:15 PM', 'Deluxe Twin', null, 2, 1, 'BAR', 5250::numeric, 'Pay at Hostel', 'Late checkout requested.'),
    ('GH-28538', 1, '5:30 PM', 'Standard Queen', null, 1, 0, 'BAR', 3900::numeric, 'Cash Deposit', null)
)
update reservations
set
  status = 'due_in',
  arrival_date = (now() at time zone 'Asia/Manila')::date,
  departure_date = (now() at time zone 'Asia/Manila')::date + (arrival_refresh.departure_offset || ' days')::interval,
  eta = arrival_refresh.eta,
  requested_room_type = arrival_refresh.requested_room_type,
  assigned_room_id = coalesce(rooms.id, reservations.assigned_room_id),
  adults = arrival_refresh.adults,
  children = arrival_refresh.children,
  rate_plan = arrival_refresh.rate_plan,
  nightly_rate = arrival_refresh.nightly_rate,
  payment_method = arrival_refresh.payment_method,
  notes = arrival_refresh.notes
from arrival_refresh
left join rooms on rooms.room_number = arrival_refresh.assigned_room_number
where reservations.confirmation_number = arrival_refresh.confirmation_number
  and reservations.status in ('reserved', 'due_in', 'cancelled', 'no_show');

with assigned_arrivals(room_number, guest_name) as (
  values
    ('402', 'Alicia Fernandez'),
    ('318', 'Robert Delgado')
)
update rooms
set
  occupancy_status = 'assigned',
  current_guest_name = assigned_arrivals.guest_name
from assigned_arrivals
where rooms.room_number = assigned_arrivals.room_number
  and rooms.occupancy_status <> 'occupied';

with demo_stays(first_name, last_name, room_number, room_type, departure_offset, room_charge, payment_amount, charge_reference, payment_reference) as (
  values
    ('Daniel', 'Reyes', '305', 'Standard Queen', 0, 16500::numeric, 0::numeric, 'POST-1001', null),
    ('Linda', 'Park', '303', 'Deluxe', 0, 4250::numeric, 0::numeric, 'POST-1002', null),
    ('Ramon', 'Cruz', '401', 'Deluxe', 1, 7800::numeric, 7800::numeric, 'POST-1003', 'PAY-1001'),
    ('Ana', 'Romero', '202', 'Standard Queen', 2, 3900::numeric, 3900::numeric, 'POST-1004', 'PAY-1002'),
    ('Jose', 'Rivera', '301', 'Standard Queen', 1, 3900::numeric, 0::numeric, 'POST-1005', null)
),
inserted_guests as (
  insert into guest_profiles (first_name, last_name, nationality, vip)
  select first_name, last_name, 'Filipino', false
  from demo_stays
  where not exists (
    select 1
    from stays
    join rooms on rooms.id = stays.room_id
    where rooms.room_number = demo_stays.room_number
      and stays.status = 'in_house'
  )
  returning id, first_name, last_name
),
inserted_stays as (
  insert into stays (guest_profile_id, room_id, departure_date)
  select inserted_guests.id, rooms.id, (now() at time zone 'Asia/Manila')::date + (demo_stays.departure_offset || ' days')::interval
  from inserted_guests
  join demo_stays on demo_stays.first_name = inserted_guests.first_name and demo_stays.last_name = inserted_guests.last_name
  join rooms on rooms.room_number = demo_stays.room_number
  returning id, guest_profile_id
),
inserted_folios as (
  insert into folios (stay_id)
  select id from inserted_stays
  returning id, stay_id
),
room_charges as (
  insert into folio_transactions (folio_id, transaction_type, source, description, amount, reference)
  select inserted_folios.id, 'room_charge', 'front_desk', 'Accommodation', demo_stays.room_charge, demo_stays.charge_reference
  from inserted_folios
  join inserted_stays on inserted_stays.id = inserted_folios.stay_id
  join inserted_guests on inserted_guests.id = inserted_stays.guest_profile_id
  join demo_stays on demo_stays.first_name = inserted_guests.first_name and demo_stays.last_name = inserted_guests.last_name
)
insert into folio_transactions (folio_id, transaction_type, source, description, amount, reference)
select inserted_folios.id, 'payment', 'card', 'Card payment', -demo_stays.payment_amount, demo_stays.payment_reference
from inserted_folios
join inserted_stays on inserted_stays.id = inserted_folios.stay_id
join inserted_guests on inserted_guests.id = inserted_stays.guest_profile_id
join demo_stays on demo_stays.first_name = inserted_guests.first_name and demo_stays.last_name = inserted_guests.last_name
where demo_stays.payment_amount > 0;

commit;
