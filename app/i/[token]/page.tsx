import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { PasswordGate } from "@/components/PasswordGate";
import { SoftRsvp } from "@/components/SoftRsvp";
import { WelcomeNote } from "@/components/WelcomeNote";
import { TravelStay } from "@/components/TravelStay";
import { Reveal } from "@/components/Reveal";
import { getPartyByToken, markOpened } from "@/lib/party";
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
  const named = party.guests.filter((g) => g.name).map((g) => g.name!);

  return (
    <>
      <main>
        {/* Full hero — date and place appear only here, behind the token. */}
        <Hero />

        {siteConfig.sections.welcomeNote && <WelcomeNote />}

        {/* The household greeting sits above the weekend, so the original
            "The weekend" section keeps its own heading and copy. */}
        <section className="weekend" id="weekend">
          <div className="container">
            <Reveal>
              <p className="eyebrow center">Your invitation</p>
              <h2 className="section-title center">{party.displayName}</h2>
              <p className="section-intro center">
                {named.length > 0 && <>This link is for {formatNames(named)}. </>}
                Not you? Let us know and we&apos;ll send the right one.
              </p>
            </Reveal>

            <Reveal>
              <p className="eyebrow center" style={{ marginTop: "4.5rem" }}>
                The weekend
              </p>
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
          <p className="footer-note">Full details to follow</p>
        </div>
      </footer>
    </>
  );
}

function formatNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
