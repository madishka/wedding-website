import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Hero } from "@/components/Hero";
import { Rsvp } from "@/components/Rsvp";
import { TravelStay } from "@/components/TravelStay";
import { Weekend } from "@/components/Weekend";
import { siteConfig } from "@/lib/site-config";

export default function Page() {
  const { couple, dateLabel, placeLabel, whatsappGroupUrl, announcement } =
    siteConfig;

  return (
    <>
      <AnnouncementBanner message={announcement} />
      <main>
        <Hero />
        <Weekend />
        <TravelStay />
        <Rsvp />
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
          {whatsappGroupUrl && (
            <a
              className="whatsapp-chip"
              href={whatsappGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Join the WhatsApp group
            </a>
          )}
          <p className="footer-note">Full website &amp; details to follow</p>
        </div>
      </footer>
    </>
  );
}
