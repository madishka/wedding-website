import { Reveal } from "./Reveal";
import { siteConfig } from "@/lib/site-config";

/**
 * The welcome note — the couple's own words, plus the one piece of
 * housekeeping that matters this early: invitations are per household,
 * and not everyone is invited to every event.
 *
 * Saying that here, plainly and warmly, is what stops a guest forwarding
 * their link to a friend who then sees an event they weren't invited to.
 */
export function WelcomeNote() {
  const { welcomeNote, couple } = siteConfig;

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
            One small thing: every invitation is personal. The link we sent is
            just for your household, and the weekend you see here is the one
            we&apos;re inviting you to — a few of the gatherings are smaller
            than others. Please keep your link to yourselves; if someone
            thinks they&apos;re missing theirs, send them our way.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
