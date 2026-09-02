import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { PasswordGate } from "@/components/PasswordGate";
import { SoftRsvp } from "@/components/SoftRsvp";
import { TravelStay } from "@/components/TravelStay";
import { Reveal } from "@/components/Reveal";
import { getPartyByToken, markOpened } from "@/lib/party";
import { householdGreeting } from "@/lib/names";
import { hasUnlockCookie } from "@/lib/unlock";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // Same as the public root on purpose: a personal link pasted into a
  // group chat must not preview the date or the island.
  title: "Madelaine & Philip",
  description: "",
};

export default async function PartyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const party = await getPartyByToken(token);
  if (!party) notFound();

  // The password curtain. Households without one fall straight through, so
  // every link minted before passwords existed keeps working.
  //
  // This returns BEFORE anything below is rendered — the date, the island
  // and the itinerary are never sent to a browser that hasn't unlocked, not
  // hidden in it with CSS.
  if (party.hasPassword && !(await hasUnlockCookie(party.id, party.passwordSetAt))) {
    return <PasswordGate />;
  }

  // Stamped after the gate on purpose: "first opened" should mean somebody
  // actually got in, not that a link was loaded.
  await markOpened(party.id);

  const { couple, dateLabel, placeLabel, replyBy } = siteConfig;

  return (
    <>
      <main>
        {/* Full hero — date and place appear only here, behind the token.
            The caldera clip, scrubbed by scroll (same as the public root
            and /preview). */}
        <Hero backdrop="video" />

        {/* The welcome note lives inside the RSVP card now (SoftRsvp),
            so the page goes straight to the weekend. */}
        <section className="weekend" id="weekend">
          <div className="container">
            <Reveal>
              <p className="eyebrow center">The weekend</p>
              <h2 className="section-title center">
                A long weekend on the Aegean
              </h2>
            </Reveal>

            {/* Two ways to show the weekend, chosen by siteConfig.
                weekendDetail. The outline is what every household sees for
                the save-the-date: the shape of the weekend, with the days
                either side still open. The per-event branch below is the
                real itinerary, and it is already filtered by party_events —
                it is waiting on the invitations, not on code. */}
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

        <SoftRsvp
          guestNames={householdGreeting(party.guests, party.displayName)}
          initialResponse={party.softResponse}
          initialEmail={party.contactEmail}
          initialNote={party.softNote}
          replyBy={replyBy}
          emblem
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
