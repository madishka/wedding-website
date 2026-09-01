-- ═══════════════════════════════════════════════════════════════════════
--  Madelaine & Philip — wedding site schema
--
--  Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
--  It is idempotent: safe to re-run after edits.
--
--  Model: a PARTY is a household. It holds one unguessable token — one
--  link, shared by everyone in the household. GUESTS are the individual
--  people inside it, so a party of 3 has 3 rows and 3 meal choices.
--  PARTY_EVENTS decides which events a household is invited to (this is
--  where family-only vs everyone lives). RSVPS is one row per person per
--  event, so Rebecca can skip the boat party while Eric goes.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Parties (households) ──────────────────────────────────────────────
create table if not exists parties (
  id              uuid primary key default gen_random_uuid(),

  -- The credential. 22 random chars, minted by scripts/import-guests.mjs.
  -- Never regenerate casually: it invalidates a link already sent.
  token           text not null unique,

  -- Stable natural key from the CSV (normalized household name).
  -- This is what makes re-importing update instead of duplicate.
  import_key      text not null unique,

  display_name    text not null,          -- "Eric & Rebecca Chen"
  contact_email   text,
  contact_phone   text,
  invited_via     text,                   -- whatsapp | email | sms | ...
  notes           text,

  -- Invite tracking. With no paper trail, this is your "who haven't we
  -- heard from" view.
  sent_at         timestamptz,
  first_opened_at timestamptz,

  -- ── Wave one: the soft save-the-date reply ─────────────────────────
  -- Deliberately household-level and non-binding. "yes" means "we plan
  -- to be there", "no" means "we definitely can't". The real per-guest,
  -- per-event answers land in `rsvps` later, and do not overwrite this.
  soft_response      text,   -- constrained below, as a named constraint
  soft_responded_at  timestamptz,
  soft_note          text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists parties_token_idx on parties (token);

-- ── The password (optional, per household) ────────────────────────────
--
-- Null = no password: the link opens straight to the invitation. This is
-- the default, and every household created before this column existed
-- keeps working untouched.
--
-- The password is a SECOND curtain, not the lock. The token is already
-- 109 unguessable bits; this only helps in the narrow case where the bare
-- URL leaks on its own — a screenshot of the address bar, a link pasted
-- into a group chat without the accompanying message, a shared browser's
-- history. Treat it accordingly: it is fine for it to be "chen2027".
--
-- Never stored in the clear. scrypt, salted, written by the CSV importer
-- or `npm run password` — see scripts/lib/password-utils.mjs.
alter table parties add column if not exists password_hash   text;

-- Bumped every time the password actually CHANGES. It is folded into the
-- signature on the unlock cookie, which is what makes a password change
-- log every already-unlocked device back out. Without it, resetting a
-- leaked household's password would not actually evict anyone.
alter table parties add column if not exists password_set_at timestamptz;

-- Additive, for a database created before the soft-reply columns existed.
-- No-ops on a fresh schema.
alter table parties add column if not exists soft_response     text;
alter table parties add column if not exists soft_responded_at timestamptz;
alter table parties add column if not exists soft_note         text;

-- Named so it is added exactly once, whether the table was just created
-- or already existed. Re-running the file is a no-op.
do $$
begin
  alter table parties add constraint parties_soft_response_check
    check (soft_response in ('yes', 'no'));
exception
  when duplicate_object then null;
end $$;

-- ── Guests (individuals) ──────────────────────────────────────────────
create table if not exists guests (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references parties(id) on delete cascade,

  -- Stable per-party key from the CSV, so re-import updates in place.
  -- For unnamed slots this is "slot-1", "slot-2", ...
  import_key  text not null,

  -- Null = an unnamed slot (a plus one, or "+ child") that the guest
  -- fills in themselves at RSVP time.
  name        text,

  guest_type  text not null default 'adult'
                check (guest_type in ('adult', 'child', 'infant', 'plus_one')),

  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),

  unique (party_id, import_key)
);

create index if not exists guests_party_idx on guests (party_id);

-- ── Events ────────────────────────────────────────────────────────────
create table if not exists events (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  date_label         text not null,        -- "July 23 · Evening"
  starts_at          timestamptz,
  venue              text,

  -- Kept out of the public save-the-date page on purpose — only ever
  -- rendered behind a token.
  address            text,
  description        text,

  -- Only seated meals ask for a food choice. Pool party doesn't.
  needs_meal_choice  boolean not null default false,
  meal_options       text[] not null default '{}',

  sort_order         int not null default 0
);

-- ── Which households are invited to which events ──────────────────────
create table if not exists party_events (
  party_id  uuid not null references parties(id) on delete cascade,
  event_id  uuid not null references events(id)  on delete cascade,
  primary key (party_id, event_id)
);

-- ── RSVPs: one row per person, per event ──────────────────────────────
create table if not exists rsvps (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid not null references guests(id) on delete cascade,
  event_id    uuid not null references events(id) on delete cascade,

  -- Null = not answered yet (distinct from an explicit "no").
  attending   boolean,
  meal        text,
  dietary     text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- This is the "can only register once" guarantee. Combined with an
  -- upsert, a returning guest edits their answer instead of adding a
  -- second one.
  unique (guest_id, event_id)
);

create index if not exists rsvps_event_idx on rsvps (event_id);

-- ── updated_at maintenance ────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists parties_touch on parties;
create trigger parties_touch before update on parties
  for each row execute function touch_updated_at();

drop trigger if exists rsvps_touch on rsvps;
create trigger rsvps_touch before update on rsvps
  for each row execute function touch_updated_at();

-- ── Row level security ────────────────────────────────────────────────
-- RLS on with NO policies = the anon and authenticated keys can read
-- nothing at all. Every query goes through the Next.js server using the
-- service role key, which bypasses RLS. Guest data is never reachable
-- from the browser, so a leaked publishable key exposes nothing.
alter table parties      enable row level security;
alter table guests       enable row level security;
alter table events       enable row level security;
alter table party_events enable row level security;
alter table rsvps        enable row level security;

-- ── Events are seeded by script, not here ──────────────────────────
--
-- Run `npm run seed:events` after this file. Event copy contains "·"
-- and apostrophes, and pasting those through the clipboard mangles them
-- (pbcopy without a UTF-8 locale re-encodes as Mac Roman: "·" becomes
-- "¬∑"). The script writes over the wire as UTF-8 and is re-runnable.
