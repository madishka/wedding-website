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
