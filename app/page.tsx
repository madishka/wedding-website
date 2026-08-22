import { Hero } from "@/components/Hero";

/**
 * The public front door.
 *
 * Anyone who has the bare URL lands here, so it says only that the two
 * of them are getting married. No date, no island, no venues, no
 * itinerary, no RSVP. Everything else is behind a household's link.
 *
 * The monogram + "By invitation only" line lives inside Hero itself now
 * (an overlay that fades in as the emblem finishes turning) rather than
 * a separate footer section, so the hero never has to unpin and scroll
 * away to reveal it.
 */
export default function Page() {
  return (
    <main>
      <Hero showDetails={false} />
      {/* Scroll runway: keeps the hero pinned while its emblem turns
          from 0° to 180°. Nothing follows it, so the hero stays put
          for the entire page. */}
      <div className="emblem-scroll-space" aria-hidden="true" />
    </main>
  );
}
