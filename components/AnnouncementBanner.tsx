"use client";

import { useState } from "react";

/** Lemon banner pinned above the hero. Renders nothing when message is empty. */
export function AnnouncementBanner({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (!message || dismissed) return null;

  return (
    <div className="announcement" role="status">
      <p>{message}</p>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => setDismissed(true)}
      >
        ×
      </button>
    </div>
  );
}
