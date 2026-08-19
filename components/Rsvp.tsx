"use client";

import { useState } from "react";
import { siteConfig } from "@/lib/site-config";

type Status = "idle" | "submitting" | "done" | "error";

export function Rsvp() {
  const [attending, setAttending] = useState<"yes" | "no" | null>(null);
  const [plusOneAllowed, setPlusOneAllowed] = useState(false);
  const [plusOneAttending, setPlusOneAttending] = useState<"yes" | "no" | null>(
    null
  );
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  /** Look the guest up when they finish typing their name. */
  async function checkInvite(name: string) {
    if (!name.trim()) {
      setPlusOneAllowed(false);
      setPlusOneAttending(null);
      return;
    }
    const res = await fetch(
      `/api/invite?name=${encodeURIComponent(name)}`
    ).catch(() => null);
    const data = await res?.json().catch(() => null);
    const allowed = Boolean(data?.plusOneAllowed);
    setPlusOneAllowed(allowed);
    if (!allowed) setPlusOneAttending(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!attending || status === "submitting") return;

    const form = new FormData(e.currentTarget);
    setStatus("submitting");
    setErrorMsg("");

    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        attending,
        plusOneAttending: plusOneAllowed ? plusOneAttending : undefined,
        plusOneName: form.get("plusOneName"),
        note: form.get("note"),
      }),
    }).catch(() => null);

    if (res?.ok) {
      setStatus("done");
    } else {
      const data = await res?.json().catch(() => null);
      setErrorMsg(data?.error ?? "Something went wrong — please try again.");
      setStatus("error");
    }
  }

  const { replyBy } = siteConfig;

  return (
    <section className="rsvp" id="rsvp">
      <div className="container rsvp-grid">
        <div className="rsvp-copy">
          <h2 className="rsvp-title">
            Kindly
            <br />
            reply <span className="script">by</span>
          </h2>
          <p className="rsvp-date">
            <span>{replyBy.month}</span>
            <span className="bar" aria-hidden="true" />
            <span className="day">{replyBy.day}</span>
            <span className="bar" aria-hidden="true" />
            <span>{replyBy.year}</span>
          </p>
          <p className="rsvp-note">
            We look forward to celebrating together in {siteConfig.placeLabel}.
          </p>
          <p className="rsvp-note">
            This is only the save-the-date — a quick yes or no helps us plan.
            Meals, allergies, little ones, hotels, and RSVPs for each
            day&apos;s events will all come later.
          </p>
        </div>

        <div className="rsvp-form">
          {status === "done" ? (
            <div className="rsvp-success">
              <h3>
                Thank <span className="script">you</span>
              </h3>
              <p>
                {attending === "yes"
                  ? "You're on the list — we'll be in touch with the full details."
                  : "We appreciate you letting us know. If anything changes, just come back and update your RSVP."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="name">
                  First &amp; last name (as it appears on your invitation)*
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  maxLength={200}
                  autoComplete="name"
                  onBlur={(e) => checkInvite(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="email">
                  Email address (the best email for any wedding updates)*
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>

              <fieldset className="field">
                <legend>Will you be joining us?*</legend>
                <div className="option-stack" role="radiogroup">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={attending === "yes"}
                    className={`option ${attending === "yes" ? "selected" : ""}`}
                    onClick={() => setAttending("yes")}
                  >
                    Yes, I&apos;ll be there!
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={attending === "no"}
                    className={`option ${attending === "no" ? "selected" : ""}`}
                    onClick={() => setAttending("no")}
                  >
                    Sorry, I can&apos;t make it
                  </button>
                </div>
              </fieldset>

              {plusOneAllowed && attending === "yes" && (
                <>
                  <fieldset className="field">
                    <legend>
                      Your invitation includes a plus one — will they be
                      joining?
                    </legend>
                    <div className="option-stack" role="radiogroup">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={plusOneAttending === "yes"}
                        className={`option ${
                          plusOneAttending === "yes" ? "selected" : ""
                        }`}
                        onClick={() => setPlusOneAttending("yes")}
                      >
                        Yes, they&apos;ll be there
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={plusOneAttending === "no"}
                        className={`option ${
                          plusOneAttending === "no" ? "selected" : ""
                        }`}
                        onClick={() => setPlusOneAttending("no")}
                      >
                        No, it&apos;ll just be me
                      </button>
                    </div>
                  </fieldset>

                  {plusOneAttending === "yes" && (
                    <div className="field">
                      <label htmlFor="plusOneName">
                        Your plus one&apos;s name
                      </label>
                      <input
                        id="plusOneName"
                        name="plusOneName"
                        type="text"
                        maxLength={200}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="field">
                <label htmlFor="note">Anything we should know? (optional)</label>
                <textarea id="note" name="note" rows={3} maxLength={1000} />
              </div>

              {status === "error" && <p className="form-error">{errorMsg}</p>}

              <button
                type="submit"
                className="submit"
                disabled={!attending || status === "submitting"}
              >
                {status === "submitting" ? "Sending…" : "Submit"}
              </button>
              <p className="fine-print">
                You&apos;ll be able to update everything later — this is just a
                headcount.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
