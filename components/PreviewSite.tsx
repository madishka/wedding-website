import { Hero, type HeroBackdrop } from "@/components/Hero";
import { SectionVideo, FIN_VIDEO_CONFIG } from "@/components/SectionVideo";
import { SoftRsvp } from "@/components/SoftRsvp";
import { TravelStay } from "@/components/TravelStay";
import { Reveal } from "@/components/Reveal";
import { siteConfig } from "@/lib/site-config";
import { householdGreeting } from "@/lib/names";
import type { Party } from "@/lib/types";

/**
 * Dev-only stand-in for `/i/[token]` — same layout, but with hardcoded
 * mock data instead of a Supabase lookup, so the full site can be
 * previewed locally without setting up a database or minting a real
 * guest link. Rendered by /preview, with the scroll-scrubbed caldera
 * clip behind the hero (`heroBackdrop` switches back to the photo).
 *
 * Never reachable in production: the route 404s itself, and
 * middleware.ts only exempts the path from the token gate outside
 * development too.
 */

const MOCK_PARTY: Party = {
  id: "preview",
  token: "preview",
  // Deliberately the awkward real case, not a tidy one: a household whose
  // two people do not share a surname, and a plus-one we only know the first
  // name of. The household's own name is internal, so it can be anything
  // that reads well on the links spreadsheet.
  displayName: "Carly & Brandon",
  contactEmail: "preview@example.com",
  softResponse: null,
  softNote: null,
  hasPassword: false,
  passwordSetAt: null,
  guests: [
    { id: "g1", name: "Carly Amsterdam", guestType: "adult", sortOrder: 0 },
    { id: "g2", name: "Brandon", guestType: "plus_one", sortOrder: 1 },
  ],
  events: [
    {
      id: "e1",
      slug: "welcome-dinner",
      name: "Welcome dinner",
      dateLabel: "Fri, Jul 23",
      startsAt: null,
      venue: "Caldera Terrace",
      address: null,
      description:
        "An easy first night to say hello before the weekend gets going.",
      needsMealChoice: true,
      mealOptions: ["Chicken", "Fish", "Vegetarian"],
      sortOrder: 0,
    },
    {
      id: "e2",
      slug: "wedding",
      name: "The wedding",
      dateLabel: "Sat, Jul 24",
      startsAt: null,
      venue: "Imerovigli",
      address: null,
      description: "Ceremony and reception, right on the caldera.",
      needsMealChoice: true,
      mealOptions: ["Chicken", "Fish", "Vegetarian"],
      sortOrder: 1,
    },
    {
      id: "e3",
      slug: "pool-party",
      name: "Farewell pool party",
      dateLabel: "Sun, Jul 25",
      startsAt: null,
      venue: "Hotel Levanta",
      address: null,
      description: "A relaxed send-off before everyone heads home.",
      needsMealChoice: false,
      mealOptions: [],
      sortOrder: 2,
    },
  ],
  rsvps: [],
};

export function PreviewSite({
  heroBackdrop = "video",
}: {
  heroBackdrop?: HeroBackdrop;
}) {
  const party = MOCK_PARTY;
  const { couple, dateLabel, placeLabel, replyBy } = siteConfig;

  return (
    <>
      <main>
        <Hero backdrop={heroBackdrop} />

        {/* Weekend + travel share one scroll-scrubbed backdrop (the Oia
            blue-hour clip), pinned behind both while they scroll past —
            see SectionVideo.tsx. Inside .mid the two sections go
            transparent and their cards frost over the footage. */}
        <div className="mid">
        <SectionVideo />

        <section className="weekend" id="weekend">
          <div className="container">
            <Reveal>
              <p className="eyebrow center">The weekend</p>
              <h2 className="section-title center">
                A long weekend on the Aegean
              </h2>
            </Reveal>

            {/* Mirrors app/i/[token]/page.tsx exactly: while siteConfig.
                weekendDetail is "outline", guests see the outline days
                ("To be confirmed"), never the per-event mock below — so
                the preview must too, or it previews a page that doesn't
                exist. The per-event branch stays for when the real
                itinerary is switched on. */}
            {siteConfig.weekendDetail === "outline" ? (
              <div className="event-grid">
                {siteConfig.weekendOutline.map((day, i) => (
                  <Reveal key={day.name} delay={i * 100}>
                    <article
                      className={`event-card ${day.tbd ? "" : "featured"}`}
                    >
                      <p className="event-date">{day.dateLabel}</p>
                      <h3>{day.name}</h3>
                      <p className="event-body">{day.body}</p>
                      {day.tbd && <p className="event-tbd">To be confirmed</p>}
                    </article>
                  </Reveal>
                ))}
              </div>
            ) : party.events.length > 0 ? (
              <div className="event-grid">
                {party.events.map((event, i) => (
                  <Reveal key={event.id} delay={i * 100}>
                    <article
                      className={`event-card ${
                        event.slug === "wedding" ? "featured" : ""
                      }`}
                    >
                      <p className="event-date">{event.dateLabel}</p>
                      <h3>{event.name}</h3>
                      {event.description && (
                        <p className="event-body">{event.description}</p>
                      )}
                      {event.venue && <p className="event-body">{event.venue}</p>}
                      {event.address && (
                        <p className="event-body">{event.address}</p>
                      )}
                    </article>
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="section-intro center">
                Your itinerary is still being finalised — we&apos;ll add it
                here soon.
              </p>
            )}
          </div>
        </section>

        <TravelStay />
        </div>

        {/* The finale: the RSVP reply card over its own pinned,
            scrubbed backdrop (the daylight terrace clip), entering
            with the same cross-dissolve as the mid block. */}
        <div className="fin">
        <SectionVideo config={FIN_VIDEO_CONFIG} wrapperSelector=".fin" />

        <SoftRsvp
          guestNames={householdGreeting(party.guests, party.displayName)}
          initialResponse={party.softResponse}
          initialEmail={party.contactEmail}
          initialNote={party.softNote}
          replyBy={replyBy}
          emblem
        />
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="monogram-img"
            src="/monogram.png"
            alt={`${couple.partnerA[0]} & ${couple.partnerB[0]} monogram`}
            width={640}
            height={441}
          />
          <p className="footer-date">
            {dateLabel} · {placeLabel}
          </p>
          {siteConfig.whatsappGroupUrl && (
            <a
              className="whatsapp-chip"
              href={siteConfig.whatsappGroupUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              referrerPolicy="no-referrer"
            >
              Join the WhatsApp group
            </a>
          )}
        </div>
      </footer>
    </>
  );
}
