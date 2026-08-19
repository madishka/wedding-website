import { siteConfig } from "@/lib/site-config";
import { HeroMotion } from "./HeroMotion";

const NAV = [
  { label: "Save the date", href: "#top" },
  { label: "The weekend", href: "#weekend" },
  { label: "Travel & stay", href: "#travel" },
  { label: "RSVP", href: "#rsvp" },
];

export function Hero() {
  const { couple, dateLabel, placeLabel } = siteConfig;
  return (
    <section className="hero" id="top">
      <HeroMotion />
      {/*
        Backdrop: public/hero-sea.jpg (procedurally generated abstract
        aerial sea). Drop in any dark moody image at the same path to
        replace it — the overlay gradient keeps the type legible.
      */}
      <div className="hero-bg" aria-hidden="true" />

      <header className="nav">
        {NAV.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </header>

      <div className="hero-inner">
        <h1 className="names">
          <span className="name enter enter-1">{couple.partnerA}</span>
          <span className="script-and enter enter-2" aria-hidden="true">
            and
          </span>
          <span className="visually-hidden">and</span>
          <span className="name enter enter-3">{couple.partnerB}</span>
        </h1>
        <p className="hero-sub enter enter-4">Are getting married</p>
        <span className="hero-rule enter enter-5" aria-hidden="true" />
        <p className="hero-date enter enter-5">
          <span>{dateLabel}</span>
          <span className="sep" aria-hidden="true">
            —
          </span>
          <span>{placeLabel}</span>
        </p>
      </div>
    </section>
  );
}
