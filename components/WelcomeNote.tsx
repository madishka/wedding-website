import { Reveal } from "./Reveal";
import { siteConfig } from "@/lib/site-config";

/**
 * The welcome note — the couple's own words, plus the one piece of
 * housekeeping that matters this early: invitations are per household.
 *
 * The closing aside follows siteConfig.weekendDetail. While the weekend is
 * an outline, every household sees the same page, so promising that "the
 * weekend you see here is the one we're inviting you to" would be a
 * personalisation the site isn't doing yet. Once the real per-event
 * itinerary is switched on, that sentence becomes true and does real work:
 * it is what stops a guest forwarding their link to a friend who then sees
 * a gathering they weren't invited to.
 */
export function WelcomeNote() {
  const { welcomeNote, couple, weekendDetail } = siteConfig;

  return (
    <section className="welcome" id="welcome">
      <div className="container">
        <Reveal>
          <p className="eyebrow center">{welcomeNote.eyebrow}</p>
          <h2 className="section-title center">{welcomeNote.title}</h2>
        </Reveal>

        <Reveal delay={90}>
          <div className="welcome-body">
            {welcomeNote.paragraphs.map((text, i) => (
              <p key={i}>{text}</p>
            ))}
            <p className="welcome-signoff">
              {couple.partnerA} &amp; {couple.partnerB}
            </p>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <p className="welcome-aside">
            {weekendDetail === "outline" ? (
              <>
                One small thing: every invitation is personal. The link we
                sent is just for your household, so please keep it to
                yourselves — if someone thinks they&apos;re missing theirs,
                send them our way.
              </>
            ) : (
              <>
                One small thing: every invitation is personal. The link we
                sent is just for your household, and the weekend you see here
                is the one we&apos;re inviting you to — a few of the
                gatherings are smaller than others. Please keep your link to
                yourselves; if someone thinks they&apos;re missing theirs,
                send them our way.
              </>
            )}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
