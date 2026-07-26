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
values (current_date, 'open')
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

commit;
