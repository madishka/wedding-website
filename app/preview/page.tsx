import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { PasswordGate } from "@/components/PasswordGate";
import { SoftRsvp } from "@/components/SoftRsvp";
import { WelcomeNote } from "@/components/WelcomeNote";
import { TravelStay } from "@/components/TravelStay";
import { Reveal } from "@/components/Reveal";
import { siteConfig } from "@/lib/site-config";
import { householdGreeting } from "@/lib/names";
import type { Party } from "@/lib/types";

/**
 * Dev-only stand-in for `/i/[token]` — same layout, but with hardcoded
 * mock data instead of a Supabase lookup, so the full site can be
 * previewed locally without setting up a database or minting a real
 * guest link. Never reachable in production: this 404s itself, and
 * middleware.ts only exempts the path from the token gate outside
 * development too.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Madelaine & Philip",
  description: "",
};

const MOCK_PARTY: Party = {
  id: "preview",
  token: "preview",
  displayName: "The Rivera Family",
  contactEmail: "preview@example.com",
  contactPhone: null,
  softResponse: null,
  softNote: null,
  hasPassword: false,
  passwordSetAt: null,
  guests: [
    { id: "g1", name: "Jordan Rivera", guestType: "adult", sortOrder: 0 },
    { id: "g2", name: "Casey Rivera", guestType: "adult", sortOrder: 1 },
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

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ gate?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  // /preview?gate — the password screen on its own, so it can be designed
  // without minting a real link and setting a real password. The form will
  // not actually unlock anything here: there is no link cookie to say which
  // household it would be unlocking.
  if ("gate" in (await searchParams)) return <PasswordGate />;

  const party = MOCK_PARTY;
  const { couple, dateLabel, placeLabel, replyBy } = siteConfig;

  return (
    <>
      <main>
        <Hero />

        {siteConfig.sections.welcomeNote && (
          <WelcomeNote
            greeting={householdGreeting(party.guests, party.displayName)}
          />
        )}

        <section className="weekend" id="weekend">
          <div className="container">
            <Reveal>
              <p className="eyebrow center">The weekend</p>
              <h2 className="section-title center">
                A long weekend on the Aegean
              </h2>
            </Reveal>

            {party.events.length > 0 ? (
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

        <SoftRsvp
          householdName={party.displayName}
          initialResponse={party.softResponse}
          initialEmail={party.contactEmail}
          initialNote={party.softNote}
          replyBy={replyBy}
        />
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
