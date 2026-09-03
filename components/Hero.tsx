import { siteConfig } from "@/lib/site-config";
import { EmblemHero } from "./EmblemHero";
import { HeroMotion } from "./HeroMotion";
import { HeroVideo } from "./HeroVideo";

export type HeroBackdrop = "image" | "video";

/** Built from the visible sections, so the nav never links to a section
 *  that is switched off in lib/site-config.ts. */
function buildNav() {
  const { gettingThere, whereToStay } = siteConfig.sections;
  return [
    { label: "Save the date", href: "#top" },
    { label: "The weekend", href: "#weekend" },
    ...(gettingThere || whereToStay
      ? [{ label: "Travel & stay", href: "#travel" }]
      : []),
    { label: "RSVP", href: "#rsvp" },
  ];
}

/**
 * The hero, in two modes.
 *
 * The PUBLIC root page shows names only — no date, no place, no nav.
 * Anyone can land on `/`, and nothing there should tell them where or
 * when the wedding is. The full version renders only behind a token.
 *
 * `backdrop` picks what sits behind the full version:
 *   "image" — public/hero-sea.jpg with a slow scroll-linked zoom
 *   "video" — the caldera drone clip, scrubbed by scroll position
 *             (HeroVideo.tsx). In the full version this also renders a
 *             spacer after the pinned hero so the clip has scroll room
 *             to play out before the content sections curtain over it.
 *             On the public root the clip scrubs over the emblem's own
 *             runway instead (.emblem-scroll-space, see app/page.tsx),
 *             and nothing curtains over it.
 */
export function Hero({
  showDetails = true,
  backdrop = "image",
}: {
  showDetails?: boolean;
  backdrop?: HeroBackdrop;
}) {
  const { couple, dateLabel, placeLabel } = siteConfig;
  const useVideo = backdrop === "video";
  return (
    <>
    <section className="hero" id="top">
      <HeroMotion fadeContent={showDetails} />
      {useVideo ? (
        <HeroVideo
          runwaySelector={showDetails ? ".hero-scroll-space" : ".emblem-scroll-space"}
          curtain={showDetails}
        />
      ) : (
        /*
          Backdrop: public/hero-sea.jpg (procedurally generated abstract
          aerial sea). Drop in any dark moody image at the same path to
          replace it — the overlay gradient keeps the type legible.
        */
        <div
          className={`hero-bg ${showDetails ? "" : "hero-bg-plain"}`}
          aria-hidden="true"
        />
      )}

      {showDetails && (
        <header className="nav">
          {buildNav().map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </header>
      )}

      <div className="hero-inner">
        {showDetails ? (
          <h1 className="names">
            <span className="name enter enter-1">{couple.partnerA}</span>
            <span className="script-and enter enter-2" aria-hidden="true">
              and
            </span>
            <span className="visually-hidden">and</span>
            <span className="name enter enter-3">{couple.partnerB}</span>
          </h1>
        ) : (
          <>
            <EmblemHero />
            <span className="visually-hidden">
              {couple.partnerA} and {couple.partnerB} are getting married
            </span>
          </>
        )}
        {showDetails && <p className="hero-sub enter enter-4">Are getting married</p>}
        {showDetails && (
          <>
            <span className="hero-rule enter enter-5" aria-hidden="true" />
            <p className="hero-date enter enter-5">
              <span>{dateLabel}</span>
              <span className="sep" aria-hidden="true">
                —
              </span>
              <span>{placeLabel}</span>
            </p>
          </>
        )}
      </div>

      {/* An overlay inside the pinned hero, not a section after it, so
          the hero never scrolls away to reveal it. Always visible. */}
      {!showDetails && (
        <div className="hero-footer-overlay">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="monogram-img"
            src="/monogram.webp"
            alt={`${couple.partnerA[0]} & ${couple.partnerB[0]} monogram`}
            width={640}
            height={441}
          />
          <p className="footer-note">By invitation only</p>
        </div>
      )}

    </section>
    {/* Scroll runway for the video scrub (see HeroVideo.tsx). Empty on
        purpose: the hero above is sticky, so this just holds the page
        open while the clip plays out. Height lives in globals.css. The
        public root brings its own runway (.emblem-scroll-space). */}
    {useVideo && showDetails && (
      <div className="hero-scroll-space" aria-hidden="true" />
    )}
    </>
  );
}
