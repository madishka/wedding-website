import { siteConfig } from "@/lib/site-config";
import { EmblemHero } from "./EmblemHero";
import { HeroMotion } from "./HeroMotion";

/** Built from the visible sections, so the nav never links to a section
 *  that is switched off in lib/site-config.ts. */
function buildNav() {
  const { welcomeNote, gettingThere, whereToStay } = siteConfig.sections;
  return [
    { label: "Save the date", href: "#top" },
    ...(welcomeNote ? [{ label: "Welcome", href: "#welcome" }] : []),
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
 */
export function Hero({ showDetails = true }: { showDetails?: boolean }) {
  const { couple, dateLabel, placeLabel } = siteConfig;
  return (
    <section className="hero" id="top">
      <HeroMotion />
      {/*
        Backdrop: public/hero-sea.jpg (procedurally generated abstract
        aerial sea). Drop in any dark moody image at the same path to
        replace it — the overlay gradient keeps the type legible.
      */}
      <div
        className={`hero-bg ${showDetails ? "" : "hero-bg-plain"}`}
        aria-hidden="true"
      />

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
    </section>
  );
}
