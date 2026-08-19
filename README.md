# Madelaine & Philip — Save the Date

The save-the-date site, built as phase one of the full wedding website.
Next.js (App Router, TypeScript), hand-written CSS, no UI framework.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
```

## What's here

| Path | What it is |
| --- | --- |
| `app/page.tsx` | The whole page: hero → the weekend → travel & stay → RSVP → footer |
| `app/globals.css` | The design system (palette, type, all styling) |
| `components/` | Hero (with nav), Weekend event cards, TravelStay blocks, RSVP form, announcement banner |
| `lib/site-config.ts` | One-stop knobs: announcement, WhatsApp link, reply-by date, site phase |
| `lib/guests.ts` | The invite list — controls who gets the plus-one question |
| `lib/rsvp.ts` | RSVP data layer — **stubbed** (writes `data/rsvps.json` locally) |
| `app/api/rsvp/route.ts` | POST endpoint with validation (enforces plus-one rules server-side) |
| `app/api/invite/route.ts` | Name lookup: does this guest's invite include a plus one? |

### How the plus one works

The form asks for the guest's name as it appears on the invitation. On
blur it looks the name up (`/api/invite`), and only shows the plus-one
question if their entry in `lib/guests.ts` has `plusOneAllowed: true`.
Guests without a plus one simply never see the option. The API enforces
the same rule server-side, so the client can't be tricked into adding one.
When the full site moves to per-party token links, the lookup disappears —
the token already knows the invite.

## Before real guests use it

1. **Swap the RSVP store for Supabase.** `lib/rsvp.ts` has the exact client
   code and SQL table commented at the top. The local JSON file works in dev
   but won't survive a serverless deploy.
2. **Real copy + real guest list.** Lorem-ipsum copy lives in
   `components/Weekend.tsx` and `components/TravelStay.tsx`; the placeholder
   invite list is in `lib/guests.ts`.
3. **Protection.** The site is `noindex` (see `app/layout.tsx`) but still
   public if someone has the URL. When you're ready, add a `middleware.ts`
   checking either a shared passcode cookie or per-party token paths
   (`/rsvp/[token]`) — the token approach is the one that scales into the
   full site's per-guest RSVP links.
4. **PWA icons.** `public/icon.svg` works, but iOS wants PNG apple-touch
   icons (180×180, plus 192/512 in the manifest) for a clean home-screen add.

## Phase two (the full site)

`lib/site-config.ts` has a `phase` flag. The plan: keep this page as the
public face, and grow the full site behind per-party token links —
multi-day RSVPs (guest × event), meals/allergies/kids, hotel selection,
excursion payments (Stripe Payment Links + webhook), and WhatsApp/SMS
confirmations. The `rsvps` table in `lib/rsvp.ts` is the seed of that schema.

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
