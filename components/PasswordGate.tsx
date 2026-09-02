"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/lib/site-config";

/**
 * The password screen, shown in place of the invitation.
 *
 * It gives away NOTHING: not the date, not the island, and deliberately not
 * the household's name either. That last one is the whole point — if a bare
 * link leaks, whoever has it should not be able to learn even whose
 * invitation it is. The guest doesn't need it: they know it's their link
 * because we sent it to them.
 *
 * Which household this unlocks is decided server-side from the link cookie.
 * Nothing here identifies a party, so this form cannot be pointed at
 * someone else's password.
 */
export function PasswordGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  // Re-armed on every rejection so repeat wrong guesses shake again;
  // cleared by onAnimationEnd on the input.
  const [shaking, setShaking] = useState(false);

  const bgRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const { couple } = siteConfig;

  // Pointer parallax: the photo shifts a few pixels opposite the cursor
  // (via the --gate-par-* vars folded into the Ken Burns transform, see
  // globals.css) and the content a hair less, giving the scene depth on
  // mouse movement. Fine pointers only — it would do nothing but waste
  // events on touch — and off entirely under reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const bg = bgRef.current;
    const inner = innerRef.current;
    if (!bg || !inner) return;

    let raf = 0;
    let nx = 0;
    let ny = 0;
    const apply = () => {
      raf = 0;
      bg.style.setProperty("--gate-par-x", `${nx * -12}px`);
      bg.style.setProperty("--gate-par-y", `${ny * -8}px`);
      inner.style.transform = `translate3d(${nx * -4}px, ${ny * -3}px, 0)`;
    };
    const onMove = (e: PointerEvent) => {
      nx = e.clientX / window.innerWidth - 0.5;
      ny = e.clientY / window.innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting" || !password.trim()) return;

    setStatus("submitting");
    setError("");

    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      // Not JSON means we didn't reach the endpoint: the link cookie has
      // expired or been cleared, so middleware bounced us to the public
      // page. Saying "check your connection" there would send someone
      // chasing the wrong problem.
      if (!res.headers.get("content-type")?.includes("application/json")) {
        setError("Your link seems to have expired. Please reopen it from our message.");
        setStatus("error");
        setShaking(true);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        setShaking(true);
        return;
      }

      // The cookie is set. Re-render the server component, which will now
      // see the unlock and render the invitation instead of this.
      router.refresh();
    } catch {
      setError("Couldn't reach us just now. Please try again.");
      setStatus("error");
      setShaking(true);
    }
  }

  return (
    <main className="gate">
      {/* The aerial-sea photograph with its darkening scrim (the same
          backdrop the token page's photo hero uses). Note the earlier
          call here was the plain gradient, on the grounds that a
          recognisable photo gives away the location to whoever holds a
          leaked link — worth remembering if this ever swaps to a real
          caldera shot. */}
      <div className="hero-bg" ref={bgRef} aria-hidden="true" />

      <div className="gate-inner" ref={innerRef}>
        <h1 className="names gate-names enter enter-1">
          <span>{couple.partnerA}</span>
          <span className="script-and">and</span>
          <span>{couple.partnerB}</span>
        </h1>

        <span className="hero-rule enter enter-2" aria-hidden="true" />

        <form className="gate-form enter enter-3" onSubmit={onSubmit}>
          <label htmlFor="password" className="gate-label">
            Please enter your password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            className={shaking ? "is-shaking" : ""}
            onAnimationEnd={() => setShaking(false)}
            required
            autoFocus
            autoComplete="current-password"
            // Phones love to capitalise and autocorrect the first word of a
            // field. The server folds case anyway, but not fighting the
            // keyboard is one less thing to go wrong.
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={200}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={status === "error"}
            aria-describedby={error ? "gate-error" : undefined}
          />

          {error && (
            <p className="gate-error" id="gate-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="submit gate-submit"
            type="submit"
            disabled={status === "submitting" || !password.trim()}
          >
            {status === "submitting" ? "Checking…" : "Enter"}
          </button>

          <p className="gate-hint">
            It came in the same message as this link. Lost it? Just ask us.
          </p>
        </form>
      </div>
    </main>
  );
}
