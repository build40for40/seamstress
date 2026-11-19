CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reply_to_email TEXT NOT NULL,
  hourly_rate_pence INTEGER NOT NULL CHECK (hourly_rate_pence >= 0),
  auto_email_clients INTEGER NOT NULL DEFAULT 1 CHECK (auto_email_clients IN (0, 1)),
  show_pay_estimate INTEGER NOT NULL DEFAULT 1 CHECK (show_pay_estimate IN (0, 1)),
  next_order_number INTEGER NOT NULL DEFAULT 1001,
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'seamstress')),
  name TEXT NOT NULL,
  time_zone TEXT NOT NULL DEFAULT 'Europe/London',
  workos_user_id TEXT,
  key_hash TEXT,
  removed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX members_team ON members(team_id);
CREATE UNIQUE INDEX members_workos_user ON members(workos_user_id) WHERE workos_user_id IS NOT NULL;
CREATE UNIQUE INDEX members_key_hash ON members(key_hash) WHERE key_hash IS NOT NULL;

CREATE TABLE pay_rates (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  rate_pence INTEGER NOT NULL CHECK (rate_pence >= 0),
  effective_from TEXT NOT NULL
);
CREATE INDEX pay_rates_team ON pay_rates(team_id);
CREATE INDEX pay_rates_member ON pay_rates(member_id, effective_from);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX clients_team ON clients(team_id);

CREATE TABLE price_items (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  name TEXT NOT NULL,
  price_pence INTEGER NOT NULL CHECK (price_pence >= 0),
  archived_at TEXT
);
CREATE INDEX price_items_team ON price_items(team_id);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  number TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id),
  description TEXT NOT NULL,
  quote_pence INTEGER CHECK (quote_pence >= 0),
  due_date TEXT,
  express INTEGER NOT NULL DEFAULT 0 CHECK (express IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ready', 'collected', 'cancelled')),
  tracking_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX orders_team ON orders(team_id, status, due_date);
CREATE UNIQUE INDEX orders_number ON orders(team_id, number);
CREATE UNIQUE INDEX orders_tracking_token ON orders(tracking_token);

CREATE TABLE garments (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  ref TEXT NOT NULL,
  position INTEGER NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'fitting', 'done')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX garments_team ON garments(team_id);
CREATE INDEX garments_order ON garments(order_id, position);

CREATE TABLE garment_assignments (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  garment_id TEXT NOT NULL REFERENCES garments(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  assigned_at TEXT NOT NULL,
  removed_at TEXT
);
CREATE INDEX garment_assignments_team ON garment_assignments(team_id);
CREATE INDEX garment_assignments_member ON garment_assignments(member_id);
CREATE UNIQUE INDEX garment_assignments_active ON garment_assignments(garment_id, member_id) WHERE removed_at IS NULL;

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  final_price_pence INTEGER CHECK (final_price_pence >= 0),
  included_held_back TEXT NOT NULL DEFAULT '[]',
  snapshot TEXT,
  sent_at TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX invoices_team ON invoices(team_id);
CREATE INDEX invoices_order ON invoices(order_id);
CREATE UNIQUE INDEX invoices_one_draft ON invoices(order_id) WHERE status = 'draft';
CREATE UNIQUE INDEX invoices_number ON invoices(team_id, number) WHERE number IS NOT NULL;

CREATE TABLE time_entries (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  garment_id TEXT REFERENCES garments(id),
  kind TEXT NOT NULL CHECK (kind IN ('sewing', 'tidying', 'fitting', 'waiting')),
  date_local TEXT NOT NULL,
  minutes INTEGER CHECK (minutes >= 0),
  started_at TEXT,
  ended_at TEXT,
  note TEXT,
  review_status TEXT CHECK (review_status IN ('waiting', 'approved', 'held_back')),
  invoice_id TEXT REFERENCES invoices(id),
  created_by TEXT NOT NULL REFERENCES members(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((kind = 'waiting') = (garment_id IS NULL)),
  CHECK ((garment_id IS NULL) = (review_status IS NULL))
);
CREATE INDEX time_entries_team ON time_entries(team_id);
CREATE INDEX time_entries_member ON time_entries(member_id, date_local);
CREATE INDEX time_entries_garment ON time_entries(garment_id);
CREATE INDEX time_entries_invoice ON time_entries(invoice_id);
CREATE UNIQUE INDEX time_entries_one_running ON time_entries(member_id) WHERE ended_at IS NULL AND started_at IS NOT NULL;

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  garment_id TEXT NOT NULL REFERENCES garments(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  r2_key TEXT NOT NULL,
  caption TEXT,
  label TEXT CHECK (label IN ('before', 'progress', 'after')),
  review_status TEXT NOT NULL DEFAULT 'waiting' CHECK (review_status IN ('waiting', 'approved', 'held_back')),
  taken_on TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX photos_team ON photos(team_id);
CREATE INDEX photos_garment ON photos(garment_id, taken_on);

CREATE TABLE timesheets (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent')),
  sent_at TEXT NOT NULL,
  reopened_at TEXT
);
CREATE INDEX timesheets_team ON timesheets(team_id, month);
CREATE UNIQUE INDEX timesheets_member_month ON timesheets(member_id, month);

CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  order_id TEXT REFERENCES orders(id),
  garment_id TEXT REFERENCES garments(id),
  member_id TEXT REFERENCES members(id),
  kind TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX activity_team ON activity(team_id);
CREATE INDEX activity_order ON activity(order_id, created_at);
