import { Reveal } from "./Reveal";
import { siteConfig } from "@/lib/site-config";

/**
 * The welcome note — the couple's own words, addressed to this household by
 * name, plus the one piece of housekeeping that matters this early.
 *
 * The greeting is the only personalised thing on the page now that the
 * weekend is shown as an outline, so it is doing real work: it is how a
 * guest can tell at a glance that this link is theirs and not a forward.
 */
export function WelcomeNote({ greeting }: { greeting: string }) {
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
            <p className="welcome-greeting">
              {welcomeNote.greeting} {greeting},
            </p>
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
            Every invite is personal. Please do not share your invite link
            with others.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
