"use client";

import { useState } from "react";
import { EmblemRsvp } from "./EmblemRsvp";
import { siteConfig } from "@/lib/site-config";

type Status = "idle" | "submitting" | "done" | "error";

/**
 * Wave one: the soft save-the-date reply, as a single frosted REPLY
 * CARD floating over the finale backdrop (the terrace clip — see the
 * .fin wrapper and SectionVideo.tsx). Everything lives on the card:
 * the emblem as a small crest, the personalized welcome by name, the
 * reply-by deadline, and the form.
 *
 * Household-level and deliberately non-binding — "we plan to be there"
 * or "we definitely can't". The per-guest, per-event RSVP with meals
 * comes later, through this same link.
 *
 * The party is identified by the link cookie, server-side. Nothing here
 * says which household is replying, so this form can't be pointed at
 * someone else's invitation.
 */
export function SoftRsvp({
  guestNames,
  initialResponse,
  initialEmail,
  initialNote,
  replyBy,
  emblem = false,
}: {
  /**
   * The people, by first name — "Nadia and Theo" — not the household's
   * internal name. Those are not the same thing: a household called
   * "Whitlock Household" may well contain a Theo who is not a
   * Whitlock, and asking "Can Whitlock Household come?" would put a
   * surname on someone who doesn't have it.
   */
  guestNames: string;
  initialResponse: "yes" | "no" | null;
  initialEmail: string | null;
  initialNote: string | null;
  replyBy: { month: string; day: string; year: string };
  /**
   * Show the turning emblem as the card's crest (EmblemRsvp.tsx).
   * On for both the preview and the token page.
   */
  emblem?: boolean;
}) {
  const [response, setResponse] = useState<"yes" | "no" | null>(initialResponse);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [note, setNote] = useState(initialNote ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // A household that already replied gets their answer back, editable.
  const alreadyReplied = initialResponse !== null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!response || status === "submitting") return;

    setStatus("submitting");
    setError("");

    try {
      const res = await fetch("/api/soft-rsvp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response, email, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Couldn't reach us just now. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <section className="rsvp" id="rsvp">
        <div className="container">
          <div className="rsvp-card rsvp-success">
            <h3 className="rsvp-title">Thank you</h3>
            <p>
              {response === "yes"
                ? "That's all we need for now — go ahead and hold the dates. We'll be in touch with the full details, and you'll reply properly then."
                : "Thank you for letting us know so early. It genuinely helps."}
            </p>
            <p className="fine-print">
              Changed your mind? Come back to this link any time and update
              your answer.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rsvp" id="rsvp">
      <div className="container">
        {/* Two columns on desktop, like the facing pages of an
            invitation — the note on the left, the reply on the right —
            so the card fits a screen instead of stacking two of them.
            Collapses to one column on mobile. */}
        <div className="rsvp-card rsvp-card--split">
          <div className="rsvp-card-grid">
          <div>
          {emblem && <EmblemRsvp />}
          <h2 className="rsvp-title">
            {siteConfig.welcomeNote.greeting} {guestNames},
          </h2>
          {siteConfig.welcomeNote.paragraphs.map((text, i) => (
            <p key={i} className="rsvp-note">
              {text}
            </p>
          ))}

          <p className="rsvp-reply-label">Kindly reply by</p>
          <p className="rsvp-date">
            <span>{replyBy.month}</span>
            <span className="bar" aria-hidden="true" />
            <span className="day">{replyBy.day}</span>
            <span className="bar" aria-hidden="true" />
            <span>{replyBy.year}</span>
          </p>
          </div>

          <div>
          <form onSubmit={onSubmit}>
            <fieldset className="field">
              <legend>Can {guestNames} come?</legend>
              <div className="option-stack" role="radiogroup">
                <button
                  type="button"
                  role="radio"
                  aria-checked={response === "yes"}
                  className={`option ${response === "yes" ? "selected" : ""}`}
                  onClick={() => setResponse("yes")}
                >
                  <span>We&apos;re planning to be there</span>
                  <span className="option-emoji" aria-hidden="true">
                    {response === "yes" ? "😍" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={response === "no"}
                  className={`option ${response === "no" ? "selected" : ""}`}
                  onClick={() => setResponse("no")}
                >
                  <span>Sadly, we can&apos;t make it</span>
                  <span className="option-emoji" aria-hidden="true">
                    {response === "no" ? "💔" : ""}
                  </span>
                </button>
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor="email">
                Best email for the household*
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <p className="fine-print">
                This is where the full invitation will go.
              </p>
            </div>

            <div className="field">
              <label htmlFor="note">Anything we should know? (optional)</label>
              <textarea
                id="note"
                name="note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
              className="submit"
              type="submit"
              disabled={!response || status === "submitting"}
            >
              {status === "submitting"
                ? "Sending…"
                : alreadyReplied
                  ? "Update our answer"
                  : "Send"}
            </button>
          </form>

          <p className="rsvp-aside">
            Every invite is personal. Please do not share your invite link
            with others.
          </p>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
