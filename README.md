# Madelaine & Philip — Save the Date

The save-the-date site, built as phase one of the full wedding website.
Next.js (App Router, TypeScript), hand-written CSS, no UI framework.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Or from the parent folder: `bash run-local.sh`

Every npm script routes through `scripts/with-node22.sh`, which selects
Node 22 via nvm if your shell defaults to something older. Next 15 needs
18.18+, and `@supabase/supabase-js` needs the global `fetch`/`Headers`
that arrived in 18 — on Node 16 it dies with `Headers is not defined`.
Vercel already runs 22, so this only affects local dev.

Check your setup at any time:

```bash
npm run check
```

## What's here

| Path | What it is |
| --- | --- |
| `app/page.tsx` | The **public** root — names only, no date, no place, no RSVP |
| `app/globals.css` | The design system (palette, type, all styling) |
| `components/` | Hero (two modes), TravelStay, SoftRsvp, announcement banner |
| `lib/site-config.ts` | One-stop knobs: announcement, WhatsApp link, reply-by date, site phase |
| `lib/guests.ts` | The invite list — controls who gets the plus-one question |
| `supabase/schema.sql` | The database: parties, guests, events, party_events, rsvps |
| `middleware.ts` | The gate — default deny, per-household link tokens |
| `app/i/[token]/page.tsx` | A household's private page: date, place, their events, RSVP |
| `components/PasswordGate.tsx` | The password screen, shown in place of all of that |
| `app/api/unlock/route.ts` | Checks a password, sets the signed unlock cookie |
| `lib/unlock.ts` | Mints and verifies that cookie; throttles guessing |
| `scripts/lib/password-utils.mjs` | scrypt hashing — shared with the importer, so the format can't drift |
| `scripts/set-password.mjs` | `npm run password` — set, clear, or list passwords |
| `components/SoftRsvp.tsx` | Wave-one reply — household-level, non-binding |
| `app/api/soft-rsvp/route.ts` | Saves it; identifies the household from the cookie |
| `lib/party.ts` | Looks a household up by token, with their events and RSVPs |
| `lib/supabase.ts` | Server-only client (service role key) |
| `scripts/import-guests.mjs` | Guest list CSV → Supabase, idempotent, mints links |


## Setting up Supabase (one time, ~5 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Dashboard → **SQL Editor** → New query → paste all of
   `supabase/schema.sql` → Run. Safe to re-run after edits — and you do
   need to re-run it after pulling a change that adds columns, like the
   password ones. `npm run check` tells you when it is outstanding.
3. Dashboard → **Project Settings → API**. Copy the project URL and the
   **service role** key (not the anon one).
4. `cp .env.local.example .env.local` and fill both in.

`.env.local` is gitignored. The service role key bypasses row level
security — it is server-only and must never reach the browser.

> **Free tier pauses after ~a week of inactivity.** With a 2027 wedding
> that will bite you. Add a weekly cron ping, or go Pro for the months
> around your reply-by date.

## The guest list

The list lives in a spreadsheet, not in code. One row per **guest**, with
a `household` column grouping them — household-level fields (contact,
events) only need filling on the first row of each household.

```csv
household,contact_email,contact_phone,invited_via,events,guest_name,guest_type,notes
Eric & Rebecca Chen,eric@example.com,+15551234567,whatsapp,"boat-party;wedding;pool-party",Eric Chen,adult,
Eric & Rebecca Chen,,,,,Rebecca Chen,adult,
Eric & Rebecca Chen,,,,,Mia Chen,child,
```

That is one party, one link, three guests, three individual meal choices.

`guest_type` is `adult` / `child` / `infant` / `plus_one`. Leave
`guest_name` blank for an unnamed plus-one slot the guest fills in
themselves at RSVP time. `events` are slugs, separated by `;`.

```bash
cp scripts/guests.sample.csv scripts/guests.csv   # then edit it
npm run import:guests -- --check                  # read the CSV, no database
npm run import:guests -- --dry-run                # show what would change
npm run import:guests                             # apply
```

The import is **idempotent** — households are matched on a normalized
name, so editing the spreadsheet and re-running updates in place.
**Tokens are minted once and never regenerated**, so re-importing will
never invalidate a link you have already sent.

Guests removed from the CSV are reported but kept, because deleting a
guest also deletes their RSVPs. Pass `--prune` to actually remove them.

Every run writes `scripts/out/links.csv` — each household with its
private link, ready to paste into WhatsApp or a mail merge. That file is
gitignored; it is the keys to the site.

## Setting and changing passwords

Two ways in, for two different jobs.

**In the spreadsheet, for setting up or changing many at once.** Add a
`password` column to `scripts/guests.csv` and re-run the import:

```csv
household,contact_email,events,password,guest_name,guest_type
Eric & Rebecca Chen,eric@example.com,wedding,chen418,Eric Chen,adult
Eric & Rebecca Chen,,,,Rebecca Chen,adult
```

```bash
npm run import:guests -- --check     # shows each household's password
npm run import:guests -- --dry-run   # shows what would change
npm run import:guests                # apply
```

The column is opt-in and the rules are worth knowing:

| In the CSV | What happens |
| --- | --- |
| No `password` column at all | Passwords are left exactly as they are |
| A value | That becomes the household's password |
| The **same** value as before | Nothing. Not rewritten, nobody logged out |
| **Blank**, column present | That household's password is **removed** |

That third row is the one that matters day to day: a routine re-import to
add one guest must not make forty households re-type their password, so
the importer verifies before it rewrites and only a genuine change bumps
`password_set_at`.

Every run writes `scripts/out/links.csv` with the link and the password
side by side, ready to paste into one message.

**On the command line, for a one-off reset.** When someone loses theirs,
or a link gets forwarded somewhere it shouldn't have been:

```bash
npm run password -- --list                        # who has one
npm run password -- "Eric & Rebecca Chen"         # set a generated one
npm run password -- "Eric & Rebecca Chen" chen418 # set a specific one
npm run password -- --clear "Aunt Sofia"          # remove it
npm run password -- --all                         # generate for everyone
                                                  # who doesn't have one
```

Partial names work — `npm run password -- chen` finds the Chens, and says
so if it matches more than one household.

`--all` is the usual first move: it generates a `surname` + three digits
password for every household that hasn't got one, and writes them to
`scripts/out/passwords.csv`. **That file is the only plaintext copy.**
Hashes are one-way, so a lost password can only be replaced, never read
back — `--list` will tell you a password exists but never what it is.

> `scripts/guests.csv` and `scripts/out/` are gitignored, and they hold
> plaintext passwords. That is a deliberate trade: these are curtains over
> a save-the-date, not credentials worth protecting like credentials. Keep
> the files somewhere you'll still have them in a year, and don't paste
> them into anything shared.

## What the public page gives away

Nothing. `/` shows the two names, "are getting married", and an
instruction to use your personal link. Deliberately absent:

- the date and the location, in the copy **and** in the `<title>` and
  manifest — those are what render in a WhatsApp or iMessage link
  preview, and previews get forwarded
- the itinerary, travel notes, and any RSVP
- the caldera photograph. It is recognisable, and a picture leaks a
  location just as well as a sentence does. The root uses a plain
  gradient (`.hero-bg-plain`) and never requests the image at all.

Everything above lives behind a token. If you add anything to the public
page, ask what a stranger with the bare URL would learn from it.

## How access works

Each household gets one unguessable link: `/i/<22-char-token>`, and
optionally a password on top of it.

- `middleware.ts` is **default deny**: `/` is public, everything else
  needs a token in the path or in the cookie set on first visit.
- The cookie lasts two years, so a guest never needs the original message
  again on that device.
- Middleware only checks the token's *shape* — it never touches the
  database. Real validation happens in the page, so a forged cookie gets
  you past the gate and straight into a 404.
- **Events are filtered in the SQL query**, through `party_events`. An
  event a household is not invited to never enters the response at all —
  it is not hidden in the browser, it simply is not there.
- The whole site is `noindex`, via both metadata and an `X-Robots-Tag`
  header, plus `robots.txt`.

### The password, and what it is actually for

**The token is the lock. The password is a curtain.** 22 characters is
~109 bits — nobody guesses that. So be clear-eyed about what the second
factor buys you, because it is narrower than it looks:

- It does **nothing** against forwarding. You send the link and the
  password in the same WhatsApp message; whoever forwards one forwards
  both.
- It **does** help when a bare URL leaks *on its own* — a screenshot of
  someone's address bar, a link pasted into a group chat without the
  message around it, a phone handed to a relative with the browser
  history open.

That second case is real, which is why this exists. It is also why the
passwords are allowed to be `chen418`: a password that guests have to
store somewhere is a password that ends up in the same screenshot.

How it works:

- `parties.password_hash` — scrypt, salted, never plaintext. Null means
  no password, and the link opens straight through. **Null is a perfectly
  valid setting**, and every link minted before passwords existed keeps
  working untouched.
- Get it right once and a signed `wd_unlock` cookie remembers this
  browser for two years, same as the link cookie. Guests type it once.
- The cookie is **signed**, so it cannot be forged by setting
  `wd_unlock=<a party id>` in devtools.
- The signature covers `password_set_at` as well as the party id, so
  **changing a password logs that household's devices back out.** That is
  what makes a reset an actual reset.
- Passwords are matched case- and whitespace-insensitively. `"Chen418 "`
  typed by an autocapitalising phone is `chen418`. The entropy this gives
  up is irrelevant against a 109-bit token.
- The password screen leaks **nothing** — not the date, not the island,
  and deliberately not the household's name either. A leaked link should
  not even reveal whose it is.
- Ten wrong guesses per household per ten minutes. Honest caveat: that
  counter lives in memory, so on Vercel it is per serverless instance.
  It makes grinding slow and conspicuous; it is not the security
  boundary. The token is.
- `/api/soft-rsvp` checks the unlock too, not just the page. Middleware
  waves through anything with a shape-valid link cookie, so without that
  second check a leaked link could POST an RSVP without ever passing the
  password screen.

## Tests

```bash
npm test
```

Covers the CSV parser (quoted commas, escaped quotes, CRLF, BOM),
household-name normalization, and token minting — including a bias check,
since a naive `byte % 31` would skew the alphabet.

Also the two pieces of the password layer that must not be wrong:
password hashing (case folding, salting, malformed and hostile stored
hashes) and the unlock cookie (forgery, cookies from another household,
and the one that earns its keep — that changing a password stops the old
cookie verifying).

## Two waves of RSVP

**Wave one (now).** The save-the-date. Behind their link, a household
answers one non-binding question — "we're planning to be there" or
"sadly we can't" — and confirms the email the real invitation should go
to. Stored on `parties.soft_response`, editable any time by reopening
the link.

**Wave two (later).** The full RSVP: per guest, per event, with meals and
dietary notes, in the `rsvps` table. **Through the same link.** Tokens
never change, so you send them once, now, and the content behind them
deepens as details firm up. No second send, no "ignore the old link".

## Still to build

1. **The wave-two RSVP form** — per event, per guest, upserting on
   `(guest_id, event_id)` so returning guests edit rather than duplicate.
2. **Admin view** — who has been sent a link, who has opened it, who has
   replied (`parties.sent_at` / `first_opened_at` are already there).
   Passwords are covered by `npm run password` for now, which is enough
   unless someone who doesn't use a terminal needs to reset them.
4. **Confirmation emails** — Resend, on RSVP submit.
5. **PWA icons.** `public/icon.svg` works, but iOS wants PNG
   apple-touch icons (180×180, plus 192/512 in the manifest).

## Design notes

- Moody editorial look: dark aerial-sea hero, warm greige sections
  (`#F4F2ED` / `#EAE6DD`), deep ink `#202B36`.
- Type: [Italiana](https://fonts.google.com/specimen/Italiana) display,
  [Imperial Script](https://fonts.google.com/specimen/Imperial+Script) accents,
  [Jost](https://fonts.google.com/specimen/Jost) body — all self-hosted via
  Fontsource (no Google request at build or runtime).
- `public/hero-sea.jpg` is a procedurally generated abstract sea (SVG
  turbulence, no photography). Drop any dark moody image at that path to
  replace it — the overlay gradient in `.hero-bg` keeps the type legible.
