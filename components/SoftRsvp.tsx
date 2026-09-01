"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "done" | "error";

/**
 * Wave one: the soft save-the-date reply.
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
  householdName,
  initialResponse,
  initialEmail,
  initialNote,
  replyBy,
}: {
  householdName: string;
  initialResponse: "yes" | "no" | null;
  initialEmail: string | null;
  initialNote: string | null;
  replyBy: { month: string; day: string; year: string };
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
          <div className="rsvp-success">
            <h3 className="rsvp-title">
              Thank you
            </h3>
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
      <div className="container rsvp-grid">
        {/* Left column: the editorial block, as the original design had it. */}
        <div className="rsvp-copy">
          <h2 className="rsvp-title">
            Kindly
            <br />
            reply by
          </h2>
          <p className="rsvp-date">
            <span>{replyBy.month}</span>
            <span className="bar" aria-hidden="true" />
            <span className="day">{replyBy.day}</span>
            <span className="bar" aria-hidden="true" />
            <span>{replyBy.year}</span>
          </p>
          <p className="rsvp-note">
            Nothing binding — a quick yes or no is all we need this early,
            so we can get a rough sense of numbers.
          </p>
          <p className="rsvp-note">
            Additional details to follow.
          </p>
        </div>

        {/* Right column: the form itself, a single stack of fields. */}
        <form onSubmit={onSubmit}>
          <fieldset className="field">
            <legend>Can {householdName} come?</legend>
            <div className="option-stack" role="radiogroup">
              <button
                type="button"
                role="radio"
                aria-checked={response === "yes"}
                className={`option ${response === "yes" ? "selected" : ""}`}
                onClick={() => setResponse("yes")}
              >
                We&apos;re planning to be there
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={response === "no"}
                className={`option ${response === "no" ? "selected" : ""}`}
                onClick={() => setResponse("no")}
              >
                Sadly, we can&apos;t make it
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
              rows={3}
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
      </div>
    </section>
  );
}
