import { Hero } from "@/components/Hero";
import { siteConfig } from "@/lib/site-config";

/**
 * The public front door.
 *
 * Anyone who has the bare URL lands here, so it says only that the two
 * of them are getting married. No date, no island, no venues, no
 * itinerary, no RSVP. Everything else is behind a household's link.
 */
export default function Page() {
  const { couple } = siteConfig;

  return (
    <>
      <main>
        <Hero showDetails={false} />

        <section className="gate" id="enter">
          <div className="container">
            <p className="eyebrow center">The details</p>
            <h2 className="section-title center">By invitation</h2>
            <p className="section-intro center">
              Everything about the weekend — where, when, and how to reply —
              lives behind the personal link we sent you. Open that link and
              you're in; your device will remember it afterwards.
            </p>
            <p className="fine-print center">
              Can't find yours, or think you should have one? Message us and
              we'll send it over.
            </p>
          </div>
        </section>
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
          <p className="footer-note">By invitation only</p>
        </div>
      </footer>
    </>
  );
}
