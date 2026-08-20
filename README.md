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
| `components/SoftRsvp.tsx` | Wave-one reply — household-level, non-binding |
| `app/api/soft-rsvp/route.ts` | Saves it; identifies the household from the cookie |
| `lib/party.ts` | Looks a household up by token, with their events and RSVPs |
| `lib/supabase.ts` | Server-only client (service role key) |
| `scripts/import-guests.mjs` | Guest list CSV → Supabase, idempotent, mints links |


## Setting up Supabase (one time, ~5 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Dashboard → **SQL Editor** → New query → paste all of
   `supabase/schema.sql` → Run. Safe to re-run after edits.
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

Each household gets one unguessable link: `/i/<22-char-token>`. There is
no password.

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

## Tests

```bash
npm test
```

Covers the CSV parser (quoted commas, escaped quotes, CRLF, BOM),
household-name normalization, and token minting — including a bias check,
since a naive `byte % 31` would skew the alphabet.

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
